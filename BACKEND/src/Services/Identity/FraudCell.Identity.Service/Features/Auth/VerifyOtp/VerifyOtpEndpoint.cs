using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FraudCell.Identity.Service.Features.Auth.VerifyOtp;

public sealed record VerifyOtpRequest(string Msisdn, string Code, OtpPurpose Purpose);

public sealed record VerifyOtpResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    string UserId,
    string Role);

/// <summary>
/// OTP dogrulamasini tamamlar ve musteri oturumunu acar (dokuman §7.1 IDN-002/003).
/// Basarili dogrulama access token'i body'de, refresh token'i HttpOnly cookie'de doner.
/// </summary>
public static class VerifyOtpEndpoint
{
    public static void MapVerifyOtp(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/otp/verify", HandleAsync)
           .WithName("VerifyOtp")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        VerifyOtpRequest request,
        IdentityServiceDbContext db,
        OtpService otpService,
        SessionIssuer sessionIssuer,
        AuditWriter auditWriter,
        IOptions<Security.JwtSigningOptions> jwtOptions,
        CorrelationContext correlation,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var msisdn = MsisdnNormalizer.TryNormalize(request.Msisdn);
        if (msisdn is null || string.IsNullOrWhiteSpace(request.Code))
        {
            throw AppException.Validation("GSM numarasi ve OTP kodu zorunludur.");
        }

        var outcome = await otpService.VerifyAsync(msisdn, request.Purpose, request.Code.Trim(), cancellationToken);

        if (outcome != OtpVerifyOutcome.Verified)
        {
            var (code, message) = outcome switch
            {
                OtpVerifyOutcome.Expired => (ErrorCodes.OtpExpired, "OTP kodunun suresi dolmus."),
                OtpVerifyOutcome.AttemptsExceeded => (ErrorCodes.OtpAttemptsExceeded, "Maksimum deneme sayisi asildi. Yeni bir kod isteyin."),
                OtpVerifyOutcome.AlreadyConsumed => (ErrorCodes.OtpInvalid, "Bu OTP kodu zaten kullanilmis."),
                OtpVerifyOutcome.NotFound => (ErrorCodes.OtpInvalid, "Aktif bir OTP istegi bulunamadi."),
                _ => (ErrorCodes.OtpInvalid, "OTP kodu hatali."),
            };

            await db.SaveChangesAsync(cancellationToken);

            auditWriter.Record(
                actorId: null,
                action: AuditActions.LoginFailed,
                result: AuditResult.Failure,
                resourceType: "user",
                ipAddress: RefreshCookie.GetClientIp(httpContext),
                detailsJson: $$"""{"msisdn":"{{msisdn}}","reason":"{{code}}"}""");
            await db.SaveChangesAsync(cancellationToken);

            throw AppException.Unauthorized(code, message);
        }

        var user = await db.Users.SingleOrDefaultAsync(u => u.Msisdn == msisdn, cancellationToken)
            ?? throw AppException.NotFound("Kullanici bulunamadi.");

        if (!user.IsActive)
        {
            throw AppException.Forbidden("Hesap pasif durumda.");
        }

        var session = await sessionIssuer.IssueAsync(
            user, RefreshCookie.GetClientIp(httpContext), httpContext.Request.Headers.UserAgent.ToString(), existingFamilyId: null, cancellationToken);

        auditWriter.Record(
            actorId: user.Id,
            action: AuditActions.LoginSucceeded,
            result: AuditResult.Success,
            resourceType: "user",
            resourceId: user.Id,
            ipAddress: RefreshCookie.GetClientIp(httpContext));

        await db.SaveChangesAsync(cancellationToken);

        RefreshCookie.Append(httpContext.Response, session.RefreshToken, jwtOptions);

        return ApiResults.Ok(
            new VerifyOtpResponse(session.AccessToken, session.AccessTokenExpiresAt, user.Id, session.Role),
            correlation);
    }
}
