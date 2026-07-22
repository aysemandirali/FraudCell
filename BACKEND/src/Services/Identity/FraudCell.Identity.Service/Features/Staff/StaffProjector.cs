using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Staff;

/// <summary>Staff response DTO'sunu tek yerden uretir; Create/Get/List/Update ayni sekli doner.</summary>
public static class StaffProjector
{
    public static async Task<StaffResponse> ProjectAsync(
        IdentityServiceDbContext db, UserManager<ApplicationUser> userManager, ApplicationUser user, CancellationToken cancellationToken)
    {
        var profile = await db.StaffProfiles
            .Include(p => p.Specialties).ThenInclude(s => s.Specialty)
            .Include(p => p.Regions).ThenInclude(r => r.Region)
            .AsNoTracking()
            .SingleAsync(p => p.UserId == user.Id, cancellationToken);

        var roles = await userManager.GetRolesAsync(user);

        return new StaffResponse(
            user.Id,
            profile.FirstName,
            profile.LastName,
            user.Email!,
            roles.FirstOrDefault() ?? string.Empty,
            [.. profile.Specialties.Select(s => s.Specialty.Code.ToString())],
            [.. profile.Regions.Select(r => r.Region.Code.ToString())],
            profile.AssignmentEnabled,
            user.IsActive,
            profile.Version,
            profile.CreatedAt);
    }
}
