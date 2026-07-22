using System.Security.Cryptography;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudCell.Identity.Service.Security;

public sealed class OtpOptions
{
    public const string SectionName = "Otp";

    public int ExpiryMinutes { get; set; } = 5;

    public int MaxAttempts { get; set; } = 5;

    /// <summary>Dokuman §7.1 IDN-003: demo profilinde sabit kod kabul edilir.</summary>
    public bool UseFixedDemoCode { get; set; }

    public string FixedDemoCode { get; set; } = "1234";
}

public enum OtpVerifyOutcome
{
    Verified,
    NotFound,
    Expired,
    AlreadyConsumed,
    AttemptsExceeded,
    CodeMismatch,
}

/// <summary>
/// GSM + OTP dogrulama akisi (dokuman §7.1). Gercek bir SMS gateway'i bu case
/// kapsaminda yok; kod "gonderilmis" gibi loglanir ve demo profilinde sabit
/// deger kabul edilir.
/// </summary>
public sealed class OtpService(
    IdentityServiceDbContext db,
    IClock clock,
    IOptions<OtpOptions> options,
    ILogger<OtpService> logger)
{
    private readonly OtpOptions _options = options.Value;

    public async Task<string> IssueChallengeAsync(string msisdn, OtpPurpose purpose, CancellationToken cancellationToken)
    {
        var code = _options.UseFixedDemoCode
            ? _options.FixedDemoCode
            : RandomNumberGenerator.GetInt32(0, 10_000).ToString("D4", System.Globalization.CultureInfo.InvariantCulture);

        var now = clock.UtcNow;
        var challenge = new OtpChallenge
        {
            Id = Ulid.NewUlid().ToString(),
            Msisdn = msisdn,
            Purpose = purpose,
            CodeHash = Hash(msisdn, purpose, code),
            CreatedAt = now,
            ExpiresAt = now.AddMinutes(_options.ExpiryMinutes),
        };

        db.OtpChallenges.Add(challenge);
        await db.SaveChangesAsync(cancellationToken);

        // SMS entegrasyonu case kapsami disinda; demo/dogrulama amacli loglanir.
        // Kodun kendisi Information seviyesinde LOGLANMAZ (yalnizca demo modda,
        // ve o zaman zaten sabittir); bu satir yalnizca bir OTP uretildigini belgeler.
        logger.LogInformation(
            "OTP challenge issued for msisdn ending {MsisdnSuffix} (purpose {Purpose}), expires at {ExpiresAt}.",
            msisdn[^4..], purpose, challenge.ExpiresAt);

        return challenge.Id;
    }

    public async Task<OtpVerifyOutcome> VerifyAsync(
        string msisdn, OtpPurpose purpose, string providedCode, CancellationToken cancellationToken)
    {
        var challenge = await db.OtpChallenges
            .Where(c => c.Msisdn == msisdn && c.Purpose == purpose)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (challenge is null)
        {
            return OtpVerifyOutcome.NotFound;
        }

        if (challenge.ConsumedAt is not null)
        {
            return OtpVerifyOutcome.AlreadyConsumed;
        }

        var now = clock.UtcNow;
        if (challenge.ExpiresAt <= now)
        {
            return OtpVerifyOutcome.Expired;
        }

        if (challenge.AttemptCount >= _options.MaxAttempts)
        {
            return OtpVerifyOutcome.AttemptsExceeded;
        }

        challenge.AttemptCount++;

        var expectedHash = Hash(msisdn, purpose, providedCode);
        if (!CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(expectedHash),
                System.Text.Encoding.UTF8.GetBytes(challenge.CodeHash)))
        {
            await db.SaveChangesAsync(cancellationToken);
            return OtpVerifyOutcome.CodeMismatch;
        }

        challenge.ConsumedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return OtpVerifyOutcome.Verified;
    }

    private static string Hash(string msisdn, OtpPurpose purpose, string code)
        => Convert.ToHexStringLower(SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes($"{msisdn}:{purpose}:{code}")));
}
