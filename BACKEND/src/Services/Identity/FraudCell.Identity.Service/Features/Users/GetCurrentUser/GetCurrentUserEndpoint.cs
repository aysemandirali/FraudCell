using System.Security.Claims;
using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Users.GetCurrentUser;

public sealed record CurrentUserResponse(
    string UserId,
    string Role,
    string? Msisdn,
    string? Email,
    string? FirstName,
    string? LastName,
    IReadOnlyCollection<string> Specialties,
    IReadOnlyCollection<string> Regions);

/// <summary>Oturum acmis kullanicinin kendi profilini dondurur (dokuman §7.4 GetCurrentUser).</summary>
public static class GetCurrentUserEndpoint
{
    public static void MapGetCurrentUser(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/users/me", HandleAsync)
           .WithName("GetCurrentUser")
           .WithTags("Users")
           .RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        HttpContext httpContext,
        IdentityServiceDbContext db,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? httpContext.User.FindFirstValue("sub")
            ?? throw AppException.Unauthorized(ErrorCodes.Unauthorized, "Token gecersiz.");

        var role = httpContext.User.FindFirstValue("role") ?? string.Empty;
        var specialties = httpContext.User.FindAll("specialties").Select(c => c.Value).ToArray();
        var regions = httpContext.User.FindAll("regions").Select(c => c.Value).ToArray();

        var user = await db.Users
            .Include(u => u.CustomerProfile)
            .Include(u => u.StaffProfile)
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw AppException.NotFound("Kullanici bulunamadi.");

        var response = new CurrentUserResponse(
            user.Id,
            role,
            user.Msisdn,
            user.Email,
            user.CustomerProfile?.FirstName ?? user.StaffProfile?.FirstName,
            user.CustomerProfile?.LastName ?? user.StaffProfile?.LastName,
            specialties,
            regions);

        return ApiResults.Ok(response, correlation);
    }
}
