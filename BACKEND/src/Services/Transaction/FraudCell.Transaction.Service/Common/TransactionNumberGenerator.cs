using FraudCell.BuildingBlocks.Time;
using FraudCell.Transaction.Service.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Transaction.Service.Common;

/// <summary>
/// Yillik okunabilir islem numarasi uretir (dokuman `06-DATA-ARCHITECTURE.md`
/// §20): <c>TRX-{year}-{000000}</c>. <c>ON CONFLICT DO UPDATE</c> ile atomik
/// artis saglar; gaps kabul edilebilir, uniqueness zorunludur.
/// </summary>
public sealed class TransactionNumberGenerator(TransactionServiceDbContext db, IClock clock)
{
    public async Task<string> NextAsync(CancellationToken cancellationToken)
    {
        var year = clock.UtcNow.Year;
        var now = clock.UtcNow;

        var lastValue = await db.Database.SqlQuery<long>(
            $"""
             INSERT INTO txn.transaction_number_counters (year, last_value, updated_at)
             VALUES ({year}, 1, {now})
             ON CONFLICT (year)
             DO UPDATE SET last_value = txn.transaction_number_counters.last_value + 1, updated_at = {now}
             RETURNING last_value
             """)
            .SingleAsync(cancellationToken);

        return $"TRX-{year}-{lastValue:D6}";
    }
}
