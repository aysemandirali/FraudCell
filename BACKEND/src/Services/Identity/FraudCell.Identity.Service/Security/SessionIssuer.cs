using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Security;

public sealed record IssuedSession(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    string Role,
    IReadOnlyCollection<string> Specialties,
    IReadOnlyCollection<string> Regions);

/// <summary>
/// Basarili kimlik dogrulama sonrasi access+refresh token ciftini uretir.
/// Musteri ve personel akislari (OTP dogrulama, staff login, refresh) bu tek
/// noktadan gecer; boylece claim seti her yerde tutarli kalir.
/// </summary>
public sealed class SessionIssuer(
    UserManager<ApplicationUser> userManager,
    IdentityServiceDbContext db,
    JwtTokenService jwtTokenService,
    RefreshTokenService refreshTokenService)
{
    public async Task<IssuedSession> IssueAsync(
        ApplicationUser user, string? ip, string? userAgent, string? existingFamilyId, CancellationToken cancellationToken)
    {
        var roles = await userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? throw new InvalidOperationException($"User {user.Id} has no role assigned.");

        var (specialties, regions) = await GetStaffClaimsAsync(user, cancellationToken);

        var (refreshRaw, session) = await refreshTokenService.IssueAsync(user.Id, ip, userAgent, existingFamilyId, parentSessionId: null, cancellationToken);
        var access = jwtTokenService.GenerateAccessToken(user, role, specialties, regions, session.Id);

        return new IssuedSession(access.Token, access.ExpiresAt, refreshRaw, role, specialties, regions);
    }

    public async Task<(IReadOnlyCollection<string> Specialties, IReadOnlyCollection<string> Regions)> GetStaffClaimsAsync(
        ApplicationUser user, CancellationToken cancellationToken)
    {
        if (user.UserType != UserType.Staff)
        {
            return (Array.Empty<string>(), Array.Empty<string>());
        }

        var profile = await db.StaffProfiles
            .Include(p => p.Specialties).ThenInclude(s => s.Specialty)
            .Include(p => p.Regions).ThenInclude(r => r.Region)
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.UserId == user.Id, cancellationToken);

        if (profile is null)
        {
            return (Array.Empty<string>(), Array.Empty<string>());
        }

        IReadOnlyCollection<string> specialties = [.. profile.Specialties.Select(s => s.Specialty.Code.ToString())];
        IReadOnlyCollection<string> regions = [.. profile.Regions.Select(r => r.Region.Code.ToString())];
        return (specialties, regions);
    }
}
