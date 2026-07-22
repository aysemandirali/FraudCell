using System.Security.Claims;
using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Staff.CreateStaff;

public sealed record CreateStaffRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string Role,
    IReadOnlyCollection<AnalystSpecialty> Specialties,
    IReadOnlyCollection<OperationRegion> Regions);

public sealed record CreateStaffResponse(string UserId, string Email, string Role);

/// <summary>
/// Yalnizca admin personel hesabi olusturabilir (dokuman §7.1 IDN-005/ROLE-012).
/// Sifre politikasi ASP.NET Core Identity password validator'lari ile,
/// hash'leme Argon2id ile yapilir (dokuman §8.3).
/// </summary>
public static class CreateStaffEndpoint
{
    public static void MapCreateStaff(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/staff", HandleAsync)
           .WithName("CreateStaff")
           .WithTags("Staff")
           .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));
    }

    private static async Task<IResult> HandleAsync(
        CreateStaffRequest request,
        HttpContext httpContext,
        UserManager<ApplicationUser> userManager,
        IdentityServiceDbContext db,
        OutboxWriter outboxWriter,
        AuditWriter auditWriter,
        IClock clock,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
        {
            throw AppException.Validation("Ad ve soyad zorunludur.");
        }

        if (!RoleNames.StaffRoles.Contains(request.Role, StringComparer.Ordinal))
        {
            throw AppException.Validation(
                "Rol ANALYST, SUPERVISOR veya ADMIN olmalidir.",
                new Dictionary<string, object?> { ["field"] = "role" });
        }

        if (request.Specialties.Count == 0)
        {
            throw AppException.Validation("En az bir uzmanlik alani atanmalidir.");
        }

        if (request.Regions.Count == 0)
        {
            throw AppException.Validation("En az bir bolge atanmalidir.");
        }

        var existing = await userManager.FindByEmailAsync(request.Email.Trim());
        if (existing is not null)
        {
            throw new AppException(
                System.Net.HttpStatusCode.Conflict,
                ErrorCodes.EmailAlreadyRegistered,
                "Bu e-posta ile zaten bir hesap mevcut.");
        }

        var adminId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? httpContext.User.FindFirstValue("sub")
            ?? throw AppException.Forbidden();

        var now = clock.UtcNow;
        var user = new ApplicationUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            ActorType = ActorType.Staff,
            CreatedAt = now,
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            throw AppException.Validation(
                "Sifre politikasi ihlal edildi.",
                new Dictionary<string, object?>
                {
                    ["violations"] = createResult.Errors.Select(e => e.Code).ToArray(),
                    ["messages"] = createResult.Errors.Select(e => e.Description).ToArray(),
                });
        }

        await userManager.AddToRoleAsync(user, request.Role);

        var profile = new StaffProfile
        {
            UserId = user.Id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            CreatedByUserId = adminId,
            CreatedAt = now,
        };

        foreach (var specialty in request.Specialties.Distinct())
        {
            profile.Specialties.Add(new StaffSpecialty { StaffProfileUserId = user.Id, Specialty = specialty });
        }

        foreach (var region in request.Regions.Distinct())
        {
            profile.Regions.Add(new StaffRegion { StaffProfileUserId = user.Id, Region = region });
        }

        db.StaffProfiles.Add(profile);

        outboxWriter.Enqueue(
            IdentityEventTypes.StaffCreated,
            subjectId: user.Id,
            payload: new { userId = user.Id, role = request.Role, createdAt = now });

        outboxWriter.Enqueue(
            IdentityEventTypes.StaffProfileUpdated,
            subjectId: user.Id,
            payload: new
            {
                userId = user.Id,
                isActive = true,
                specialties = request.Specialties.Select(s => s.ToString()).ToArray(),
                regions = request.Regions.Select(r => r.ToString()).ToArray(),
                displayName = $"{profile.FirstName} {profile.LastName}",
                updatedAt = now,
            });

        auditWriter.Record(
            actorId: adminId,
            action: AuditActions.StaffCreated,
            result: AuditResult.Success,
            resourceType: "user",
            resourceId: user.Id,
            ipAddress: Common.RefreshCookie.GetClientIp(httpContext),
            detailsJson: $$"""{"role":"{{request.Role}}"}""");

        await db.SaveChangesAsync(cancellationToken);

        return ApiResults.Created(
            $"/api/v1/staff/{user.Id}",
            new CreateStaffResponse(user.Id, user.Email!, request.Role),
            correlation);
    }
}
