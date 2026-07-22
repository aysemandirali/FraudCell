using FraudCell.BuildingBlocks.Correlation;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;

namespace FraudCell.Identity.Service.Common;

/// <summary>
/// Identity Service audit persistence otoritesidir (dokuman §7.9): kendi
/// eylemlerini dogrudan yazar, baska servislerin eylemlerini ise
/// <c>audit.entry.requested</c> tuketicisi araciligiyla yazar (bkz. Messaging/AuditEntryRequestedConsumer).
///
/// <c>SaveChangesAsync</c> CAGIRMAZ; cagiran kod business degisiklikleriyle
/// birlikte tek transaction'da commit eder.
/// </summary>
public sealed class AuditWriter(IdentityServiceDbContext db, IClock clock, CorrelationContext correlation)
{
    public void Record(
        string? actorId,
        string action,
        AuditResult result,
        string? resourceType = null,
        string? resourceId = null,
        string? ipAddress = null,
        string? detailsJson = null)
    {
        db.AuditLogEntries.Add(new AuditLogEntry
        {
            Id = Ulid.NewUlid().ToString(),
            ActorId = actorId,
            Action = action,
            SourceService = "identity-service",
            ResourceType = resourceType,
            ResourceId = resourceId,
            IpAddress = ipAddress,
            Result = result,
            OccurredAt = clock.UtcNow,
            CorrelationId = correlation.CorrelationId,
            DetailsJson = detailsJson,
        });
    }
}
