using FraudCell.BuildingBlocks.Time;
using FraudCell.Gamification.Service.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FraudCell.Gamification.Service.Persistence;

/// <summary>Dokuman `06-DATA-ARCHITECTURE.md` §51 seed rozet tanimlari.</summary>
public static class GamificationSeed
{
    private static readonly (string Code, string DisplayName, string Description)[] Badges =
    [
        (BadgeCodes.FirstCatch, "Ilk Yakalama", "Ilk dolandiricilik vakasini cozdunuz."),
        (BadgeCodes.SharpEye, "Keskin Goz", "15 dakikanin altinda 10 karar verdiniz."),
        (BadgeCodes.ZeroError, "Sifir Hata", "50 vakada yanlis pozitif olmadan karar verdiniz."),
        (BadgeCodes.Marathon, "Maratoncu", "Bir gunde 20 vaka karari verdiniz."),
        (BadgeCodes.CrisisManager, "Kriz Yoneticisi", "10 kritik vakayi SLA icinde cozdunuz."),
        (BadgeCodes.SpecialistHunter, "Uzman Avci", "Tek fraud turunde 50 dolandiricilik yakaladiniz."),
    ];

    public static async Task RunAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<GamificationServiceDbContext>();
        var clock = services.GetRequiredService<IClock>();
        var now = clock.UtcNow;

        foreach (var (code, displayName, description) in Badges)
        {
            var exists = await db.BadgeDefinitions.AnyAsync(b => b.Code == code);
            if (!exists)
            {
                db.BadgeDefinitions.Add(new BadgeDefinition
                {
                    Id = Ulid.NewUlid().ToString(),
                    Code = code,
                    DisplayName = displayName,
                    Description = description,
                    CreatedAt = now,
                });
            }
        }

        await db.SaveChangesAsync();
    }
}
