using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FraudCell.Identity.Service.Persistence;

/// <summary>
/// EF Core design-time araclarinin (<c>dotnet ef migrations add</c>) tum
/// Program.cs'i (RabbitMQ, seed, migrate cagrilarini) calistirmadan sadece
/// modeli insa etmesini saglar. Buradaki connection string yalnizca migration
/// dosyasi uretimi icindir; gercek calisma zamaninda appsettings kullanilir.
/// </summary>
public sealed class IdentityServiceDbContextFactory : IDesignTimeDbContextFactory<IdentityServiceDbContext>
{
    public IdentityServiceDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<IdentityServiceDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5433;Database=fraudcell_identity;Username=identity_app;Password=design-time-only");

        return new IdentityServiceDbContext(optionsBuilder.Options);
    }
}
