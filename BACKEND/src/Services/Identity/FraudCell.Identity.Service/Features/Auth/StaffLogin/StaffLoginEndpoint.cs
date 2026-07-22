using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace FraudCell.Identity.Service.Features.Auth.StaffLogin;

public sealed record StaffLoginRequest(string Email, string Password);

public sealed record StaffLoginResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string UserId,
    string Role,
    IReadOnlyCollection<string> Specialties,
    IReadOnlyCollection<string> Regions);

/// <summary>
/// Personel e-posta + sifre girisi (dokuman §7.1 IDN-006). Hesap kilidi
/// ASP.NET Core Identity'nin yerlesik lockout altyapisiyla saglanir (dokuman
/// §7.1 IDN-015/016): 5 basarisiz denemede 15 dakika kilit, PostgreSQL'de kalici.
/// </summary>
public static class StaffLoginEndpoint
{
    public static void MapStaffLogin(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/staff/login", HandleAsync)
           .WithName("StaffLogin")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        StaffLoginRequest request,
        UserManager<ApplicationUser> userManager,
        SessionIssuer sessionIssuer,
        AuditWriter auditWriter,
        IOptions<JwtSigningOptions> jwtOptions,
        Persistence.IdentityServiceDbContext db,
        HttpContext httpContext,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw AppException.Validation("E-posta ve sifre zorunludur.");
        }

        var ip = RefreshCookie.GetClientIp(httpContext);
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user is null || user.ActorType != ActorType.Staff || !user.IsActive)
        {
            // Kullanici yoklugu ile yanlis sifre arasinda ayrim yapmayiz (enumeration onlemi).
            auditWriter.Record(null, AuditActions.LoginFailed, AuditResult.Failure, "user", null, ip,
                $$"""{"email":"{{request.Email.Trim()}}","reason":"INVALID_CREDENTIALS"}""");
            await db.SaveChangesAsync(cancellationToken);
            throw AppException.Unauthorized(ErrorCodes.InvalidCredentials, "E-posta veya sifre hatali.");
        }

        if (await userManager.IsLockedOutAsync(user))
        {
            var lockoutEnd = await userManager.GetLockoutEndDateAsync(user);
            auditWriter.Record(user.Id, AuditActions.LoginFailed, AuditResult.Failure, "user", user.Id, ip,
                $$"""{"reason":"ACCOUNT_LOCKED"}""");
            await db.SaveChangesAsync(cancellationToken);

            throw AppException.Unauthorized(
                ErrorCodes.AccountLocked,
                "Hesap gecici olarak kilitli.",
                new Dictionary<string, object?> { ["lockedUntil"] = lockoutEnd?.UtcDateTime });
        }

        var passwordValid = await userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            await userManager.AccessFailedAsync(user);

            var justLockedOut = await userManager.IsLockedOutAsync(user);
            if (justLockedOut)
            {
                auditWriter.Record(user.Id, AuditActions.AccountLocked, AuditResult.Success, "user", user.Id, ip);
            }

            auditWriter.Record(user.Id, AuditActions.LoginFailed, AuditResult.Failure, "user", user.Id, ip,
                $$"""{"reason":"INVALID_CREDENTIALS"}""");
            await db.SaveChangesAsync(cancellationToken);

            throw AppException.Unauthorized(ErrorCodes.InvalidCredentials, "E-posta veya sifre hatali.");
        }

        await userManager.ResetAccessFailedCountAsync(user);

        var session = await sessionIssuer.IssueAsync(
            user, ip, httpContext.Request.Headers.UserAgent.ToString(), existingFamilyId: null, cancellationToken);

        auditWriter.Record(user.Id, AuditActions.LoginSucceeded, AuditResult.Success, "user", user.Id, ip);
        await db.SaveChangesAsync(cancellationToken);

        RefreshCookie.Append(httpContext.Response, session.RefreshToken, jwtOptions);

        return ApiResults.Ok(
            new StaffLoginResponse(session.AccessToken, session.AccessTokenExpiresAt, user.Id, session.Role, session.Specialties, session.Regions),
            correlation);
    }
}
