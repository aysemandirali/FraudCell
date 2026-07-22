using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Auth.RequestOtp;

public sealed record RequestOtpRequest(string Msisdn);

public sealed record RequestOtpResponse(string OtpChallengeId, int ExpiresInSeconds);

/// <summary>
/// Var olan bir musteri hesabi icin giris OTP'si uretir (dokuman §7.1 IDN-002).
/// Kayit sirasindaki ilk OTP <c>RegisterCustomer</c> tarafindan zaten uretilir.
/// </summary>
public static class RequestOtpEndpoint
{
    public static void MapRequestOtp(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/otp/request", HandleAsync)
           .WithName("RequestOtp")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        RequestOtpRequest request,
        IdentityServiceDbContext db,
        OtpService otpService,
        Microsoft.Extensions.Options.IOptions<OtpOptions> otpOptions,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        var msisdn = MsisdnNormalizer.TryNormalize(request.Msisdn);
        if (msisdn is null)
        {
            throw AppException.Validation("Gecerli bir Turkcell GSM numarasi giriniz.");
        }

        var exists = await db.Users.AsNoTracking()
            .AnyAsync(u => u.Msisdn == msisdn && u.ActorType == ActorType.Customer, cancellationToken);

        if (!exists)
        {
            throw AppException.NotFound("Bu GSM numarasiyla kayitli bir hesap bulunamadi.");
        }

        var challengeId = await otpService.IssueChallengeAsync(msisdn, OtpPurpose.Login, cancellationToken);

        return ApiResults.Ok(
            new RequestOtpResponse(challengeId, otpOptions.Value.ExpiryMinutes * 60),
            correlation);
    }
}
