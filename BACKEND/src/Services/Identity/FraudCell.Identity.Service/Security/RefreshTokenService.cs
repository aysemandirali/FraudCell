using System.Security.Cryptography;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FraudCell.Identity.Service.Security;

public enum RefreshOutcome
{
    Success,
    Invalid,
    Expired,
    ReuseDetected,
}

public sealed record RefreshRotationResult(
    RefreshOutcome Outcome,
    string? UserId = null,
    string? NewRawToken = null,
    RefreshSession? NewSession = null,
    string? PreviousFamilyId = null);

/// <summary>
/// Refresh token family, rotation ve reuse detection (dokuman §6/§9 SEC-006).
///
/// Her rotation eskisini revoke edip ayni family'de yeni bir satir olusturur.
/// Revoke edilmis bir token TEKRAR kullanilirsa (calinti token senaryosu),
/// ailenin TUM satirlari revoke edilir ve caller kullaniciyi tamamen logout
/// etmelidir (security stamp yenileme cagiran katmanin sorumlulugundadir).
/// </summary>
public sealed class RefreshTokenService(IdentityServiceDbContext db, IClock clock, IOptions<JwtSigningOptions> options)
{
    private readonly JwtSigningOptions _options = options.Value;

    public async Task<(string RawToken, RefreshSession Session)> IssueAsync(
        string userId, string? ip, string? userAgent, string? familyId, CancellationToken cancellationToken)
    {
        var raw = GenerateRawToken();
        var now = clock.UtcNow;

        var session = new RefreshSession
        {
            Id = Ulid.NewUlid().ToString(),
            UserId = userId,
            FamilyId = familyId ?? Ulid.NewUlid().ToString(),
            TokenHash = Hash(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(_options.RefreshTokenLifetimeDays),
            CreatedIp = ip,
            UserAgent = Truncate(userAgent, 300),
        };

        db.RefreshSessions.Add(session);
        await db.SaveChangesAsync(cancellationToken);

        return (raw, session);
    }

    /// <summary>
    /// Gelen ham refresh token'i dogrular ve basariliysa rotate eder. TUM
    /// donuslerde <c>SaveChangesAsync</c> bu metot icinde cagrilir; caller ayrica
    /// commit etmek zorunda degildir.
    /// </summary>
    public async Task<RefreshRotationResult> RotateAsync(
        string rawToken, string? ip, string? userAgent, CancellationToken cancellationToken)
    {
        var hash = Hash(rawToken);
        var current = await db.RefreshSessions.SingleOrDefaultAsync(s => s.TokenHash == hash, cancellationToken);

        if (current is null)
        {
            return new RefreshRotationResult(RefreshOutcome.Invalid);
        }

        var now = clock.UtcNow;

        if (current.RevokedAt is not null)
        {
            // Bu token daha once rotate edilmis/iptal edilmisti; simdi tekrar
            // sunulmasi calinti token senaryosudur (dokuman §6 "Revoke edilmis
            // token tekrar kullanilirsa"). Tum family iptal edilir.
            var reuseTime = clock.UtcNow;
            var familyMembers = await db.RefreshSessions
                .Where(s => s.FamilyId == current.FamilyId && s.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var member in familyMembers)
            {
                member.RevokedAt = reuseTime;
            }

            current.ReuseDetectedAt = reuseTime;
            await db.SaveChangesAsync(cancellationToken);

            return new RefreshRotationResult(RefreshOutcome.ReuseDetected, current.UserId, PreviousFamilyId: current.FamilyId);
        }

        if (current.ExpiresAt <= now)
        {
            current.RevokedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return new RefreshRotationResult(RefreshOutcome.Expired, current.UserId);
        }

        var newRaw = GenerateRawToken();
        var newSession = new RefreshSession
        {
            Id = Ulid.NewUlid().ToString(),
            UserId = current.UserId,
            FamilyId = current.FamilyId,
            TokenHash = Hash(newRaw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(_options.RefreshTokenLifetimeDays),
            CreatedIp = ip,
            UserAgent = Truncate(userAgent, 300),
        };

        current.RevokedAt = now;
        current.ReplacedById = newSession.Id;

        db.RefreshSessions.Add(newSession);
        await db.SaveChangesAsync(cancellationToken);

        return new RefreshRotationResult(RefreshOutcome.Success, current.UserId, newRaw, newSession);
    }

    /// <summary>Logout: yalnizca sunulan oturumu iptal eder, ailenin geri kalanina dokunmaz.</summary>
    public async Task RevokeAsync(string rawToken, CancellationToken cancellationToken)
    {
        var hash = Hash(rawToken);
        var session = await db.RefreshSessions.SingleOrDefaultAsync(s => s.TokenHash == hash, cancellationToken);

        if (session is null || session.RevokedAt is not null)
        {
            return;
        }

        session.RevokedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    /// <summary>Token theft tespitinde veya admin zorlamasinda kullanicinin TUM oturumlarini dusurur.</summary>
    public async Task RevokeAllForUserAsync(string userId, CancellationToken cancellationToken)
    {
        var now = clock.UtcNow;
        await db.RefreshSessions
            .Where(s => s.UserId == userId && s.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.RevokedAt, now), cancellationToken);
    }

    private static string GenerateRawToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(48))
        .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string Hash(string rawToken)
        => Convert.ToHexStringLower(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));

    private static string? Truncate(string? value, int maxLength)
        => value is null ? null : (value.Length <= maxLength ? value : value[..maxLength]);
}
