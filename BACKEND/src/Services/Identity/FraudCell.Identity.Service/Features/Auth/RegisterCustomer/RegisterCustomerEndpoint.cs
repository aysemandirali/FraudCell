using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Auth.RegisterCustomer;

public sealed record RegisterCustomerRequest(string FirstName, string LastName, string Msisdn, string? Email);

public sealed record RegisterCustomerResponse(string UserId, string Msisdn, string OtpChallengeId);

/// <summary>
/// Musteri GSM kaydi (dokuman §7.1 IDN-001/IDN-004). Sifre yok; kayit hemen
/// ardindan bir OTP challenge uretir, musteri VerifyOtp ile oturumunu acar.
/// </summary>
public static class RegisterCustomerEndpoint
{
    public static void MapRegisterCustomer(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/customers/register", HandleAsync)
           .WithName("RegisterCustomer")
           .WithTags("Auth")
           .AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        RegisterCustomerRequest request,
        UserManager<ApplicationUser> userManager,
        IdentityServiceDbContext db,
        OtpService otpService,
        OutboxWriter outboxWriter,
        AuditWriter auditWriter,
        IClock clock,
        CorrelationContext correlation,
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            throw AppException.Validation("Ad ve soyad zorunludur.");
        }

        var msisdn = Common.MsisdnNormalizer.TryNormalize(request.Msisdn);
        if (msisdn is null)
        {
            throw AppException.Validation(
                "Gecerli bir Turkcell GSM numarasi giriniz.",
                new Dictionary<string, object?> { ["field"] = "msisdn" });
        }

        var existing = await db.Users.AsNoTracking().AnyAsync(u => u.Msisdn == msisdn, cancellationToken);
        if (existing)
        {
            throw new AppException(
                System.Net.HttpStatusCode.Conflict,
                ErrorCodes.MsisdnAlreadyRegistered,
                "Bu GSM numarasiyla zaten bir hesap mevcut.");
        }

        var now = clock.UtcNow;
        var user = new ApplicationUser
        {
            UserName = msisdn,
            Msisdn = msisdn,
            PhoneNumber = msisdn,
            ActorType = ActorType.Customer,
            CreatedAt = now,
        };

        var createResult = await userManager.CreateAsync(user);
        if (!createResult.Succeeded)
        {
            throw AppException.Validation(
                "Kayit olusturulamadi.",
                new Dictionary<string, object?> { ["errors"] = createResult.Errors.Select(e => e.Description).ToArray() });
        }

        await userManager.AddToRoleAsync(user, RoleNames.Customer);

        db.CustomerProfiles.Add(new CustomerProfile
        {
            UserId = user.Id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            RegisteredAt = now,
        });

        outboxWriter.Enqueue(
            IdentityEventTypes.CustomerRegistered,
            subjectId: user.Id,
            payload: new { userId = user.Id, msisdn, registeredAt = now });

        auditWriter.Record(
            actorId: user.Id,
            action: AuditActions.CustomerRegistered,
            result: AuditResult.Success,
            resourceType: "user",
            resourceId: user.Id,
            ipAddress: RefreshCookie.GetClientIp(httpContext));

        await db.SaveChangesAsync(cancellationToken);

        var challengeId = await otpService.IssueChallengeAsync(msisdn, OtpPurpose.Registration, cancellationToken);

        return ApiResults.Created(
            $"/api/v1/users/{user.Id}",
            new RegisterCustomerResponse(user.Id, msisdn, challengeId),
            correlation);
    }
}
