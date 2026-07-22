using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FraudCell.Identity.Service.Features.Auth.RefreshToken;

public sealed record RefreshTokenResponse(string AccessToken, DateTimeOffset ExpiresAt);

/// <summary>
/// Refresh token rotation (dokuman §6/§9 SEC-006). Token her kullanimda
/// rotate edilir; revoke edilmis bir token'in tekrar sunulmasi calinti token
/// senaryosu sayilir ve TUM aktif oturumlar dusurulur.
/// </summary>
public static class RefreshTokenEndpoint
{
    public static void MapRefreshToken(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/refresh", HandleAsync)
           .WithName("RefreshToken")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        HttpContext httpContext,
        RefreshTokenService refreshTokenService,
        UserManager<ApplicationUser> userManager,
        IdentityServiceDbContext db,
        JwtTokenService jwtTokenService,
        AuditWriter auditWriter,
        IOptions<JwtSigningOptions> jwtOptions,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        var rawToken = RefreshCookie.Read(httpContext.Request);
        if (rawToken is null)
        {
            throw AppException.Unauthorized(ErrorCodes.RefreshTokenInvalid, "Refresh token bulunamadi.");
        }

        var ip = RefreshCookie.GetClientIp(httpContext);
        var userAgent = httpContext.Request.Headers.UserAgent.ToString();

        var result = await refreshTokenService.RotateAsync(rawToken, ip, userAgent, cancellationToken);

        switch (result.Outcome)
        {
            case RefreshOutcome.ReuseDetected:
            {
                RefreshCookie.Clear(httpContext.Response);

                if (result.UserId is not null)
                {
                    var user = await userManager.FindByIdAsync(result.UserId);
                    if (user is not null)
                    {
                        // Security stamp yenilemesi, o an bellekte tutulan diger access
                        // token'lari iptal etmez (statik JWT'ler exp'e kadar gecerlidir),
                        // ancak yeni refresh/login akislarini ve sunucu tarafi kontrolleri
                        // etkileyecek sekilde kullanicinin oturum durumunu isaretler.
                        await userManager.UpdateSecurityStampAsync(user);
                    }
                }

                auditWriter.Record(
                    result.UserId, AuditActions.TokenReuseDetected, AuditResult.Failure,
                    "refresh_session_family", result.PreviousFamilyId, ip);
                await db.SaveChangesAsync(cancellationToken);

                throw AppException.Unauthorized(
                    ErrorCodes.RefreshTokenReuseDetected,
                    "Guvenlik ihlali tespit edildi; tum oturumlar sonlandirildi. Lutfen tekrar giris yapin.");
            }

            case RefreshOutcome.Invalid:
            case RefreshOutcome.Expired:
                RefreshCookie.Clear(httpContext.Response);
                throw AppException.Unauthorized(ErrorCodes.RefreshTokenInvalid, "Refresh token gecersiz veya suresi dolmus.");

            case RefreshOutcome.Success:
            default:
                break;
        }

        var refreshedUser = await userManager.FindByIdAsync(result.UserId!)
            ?? throw AppException.Unauthorized(ErrorCodes.RefreshTokenInvalid, "Kullanici bulunamadi.");

        var roles = await userManager.GetRolesAsync(refreshedUser);
        var role = roles.FirstOrDefault() ?? throw new InvalidOperationException($"User {refreshedUser.Id} has no role.");

        var specialties = Array.Empty<string>();
        var regions = Array.Empty<string>();

        if (refreshedUser.ActorType == ActorType.Staff)
        {
            var profile = await db.StaffProfiles
                .Include(p => p.Specialties)
                .Include(p => p.Regions)
                .AsNoTracking()
                .SingleOrDefaultAsync(p => p.UserId == refreshedUser.Id, cancellationToken);

            if (profile is not null)
            {
                specialties = [.. profile.Specialties.Select(s => s.Specialty.ToString())];
                regions = [.. profile.Regions.Select(r => r.Region.ToString())];
            }
        }

        var access = jwtTokenService.GenerateAccessToken(refreshedUser, role, specialties, regions);

        RefreshCookie.Append(httpContext.Response, result.NewRawToken!, jwtOptions);

        return ApiResults.Ok(new RefreshTokenResponse(access.Token, access.ExpiresAt), correlation);
    }
}
