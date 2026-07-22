using FraudCell.Gamification.Service.Persistence;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace FraudCell.Gamification.Service.Common;

public sealed class DatabaseHealthCheck(GamificationServiceDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await db.Database.CanConnectAsync(cancellationToken);
            return canConnect ? HealthCheckResult.Healthy("PostgreSQL connection OK.") : HealthCheckResult.Unhealthy("PostgreSQL connection failed.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("PostgreSQL connection threw an exception.", ex);
        }
    }
}
