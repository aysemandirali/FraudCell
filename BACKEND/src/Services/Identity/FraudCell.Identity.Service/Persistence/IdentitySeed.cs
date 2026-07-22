using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FraudCell.Identity.Service.Persistence;

/// <summary>
/// Uygulama acilisinda dort rolun var oldugunu garanti eder ve (yalnizca
/// yapilandirma ile acikca istenirse) ilk admin hesabini olusturur.
///
/// CreateStaff endpoint'i yalnizca ADMIN rolune acik oldugu icin (dokuman
/// §7.1 IDN-005/ROLE-012) sistemde en az bir admin bulunmadan personel hesabi
/// olusturulamaz; bu "tavuk-yumurta" problemini demo/ilk kurulum icin cozer.
/// </summary>
public static class IdentitySeed
{
    public static async Task EnsureRolesAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();

        foreach (var roleName in RoleNames.All)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new ApplicationRole(roleName));
            }
        }

        await EnsureSeedAdminAsync(services);
    }

    private static async Task EnsureSeedAdminAsync(IServiceProvider services)
    {
        var configuration = services.GetRequiredService<IConfiguration>();
        var environment = services.GetRequiredService<IHostEnvironment>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("IdentitySeed");

        var adminEmail = configuration["Seed:AdminEmail"];
        var adminPassword = configuration["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

        if (!environment.IsDevelopment())
        {
            logger.LogWarning("Seed:AdminEmail/Seed:AdminPassword ignored outside Development environment.");
            return;
        }

        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        if (await userManager.FindByEmailAsync(adminEmail) is not null)
        {
            return;
        }

        var clock = services.GetRequiredService<IClock>();
        var db = services.GetRequiredService<IdentityServiceDbContext>();

        var admin = new ApplicationUser
        {
            UserName = adminEmail,
            Email = adminEmail,
            ActorType = ActorType.Staff,
            CreatedAt = clock.UtcNow,
        };

        var result = await userManager.CreateAsync(admin, adminPassword);
        if (!result.Succeeded)
        {
            logger.LogError(
                "Failed to seed development admin account: {Errors}",
                string.Join(", ", result.Errors.Select(e => e.Description)));
            return;
        }

        await userManager.AddToRoleAsync(admin, RoleNames.Admin);

        db.StaffProfiles.Add(new StaffProfile
        {
            UserId = admin.Id,
            FirstName = "Seed",
            LastName = "Admin",
            CreatedByUserId = admin.Id,
            CreatedAt = clock.UtcNow,
        });

        await db.SaveChangesAsync();

        logger.LogWarning("Seeded development admin account {Email}. Do not use this in production.", adminEmail);
    }
}
