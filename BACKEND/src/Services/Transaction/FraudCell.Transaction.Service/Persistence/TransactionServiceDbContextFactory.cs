using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FraudCell.Transaction.Service.Persistence;

/// <summary>EF Core design-time araclari icin (bkz. Identity Service'teki esdegeri).</summary>
public sealed class TransactionServiceDbContextFactory : IDesignTimeDbContextFactory<TransactionServiceDbContext>
{
    public TransactionServiceDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TransactionServiceDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5434;Database=fraudcell_transaction;Username=transaction_app;Password=design-time-only");

        return new TransactionServiceDbContext(optionsBuilder.Options);
    }
}
