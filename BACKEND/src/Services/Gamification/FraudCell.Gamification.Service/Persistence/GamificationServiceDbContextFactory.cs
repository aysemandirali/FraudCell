using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FraudCell.Gamification.Service.Persistence;

public sealed class GamificationServiceDbContextFactory : IDesignTimeDbContextFactory<GamificationServiceDbContext>
{
    public GamificationServiceDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<GamificationServiceDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5435;Database=fraudcell_gamification;Username=gamification_app;Password=design-time-only");
        return new GamificationServiceDbContext(optionsBuilder.Options);
    }
}
