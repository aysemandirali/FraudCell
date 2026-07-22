using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Time;

namespace FraudCell.Transaction.Service.Common;

/// <summary>
/// Diger servislere ortak/cross-cutting event'leri (audit, notification)
/// gonderen ince katman. Business event'leri (transaction.created, case.*)
/// feature handler'lari dogrudan <see cref="OutboxWriter"/> ile yazar.
/// </summary>
public sealed class CrossCuttingEventPublisher(OutboxWriter outboxWriter, IClock clock)
{
    public void PublishAudit(
        string? actorId, string? actorRole, string action, string result,
        string? resourceType, string? resourceId, string? ipAddress, object? details = null)
    {
        outboxWriter.Enqueue(TransactionEventTypes.AuditEntryRequested, subjectId: resourceId ?? actorId ?? "system", payload: new
        {
            actorId,
            actorRole,
            action,
            sourceService = "transaction-service",
            resourceType,
            resourceId,
            ipAddress,
            result,
            occurredAt = clock.UtcNow,
            details,
        });
    }

    public void PublishNotification(string targetUserId, string notificationType, string title, string message, string? resourceType, string? resourceId)
    {
        outboxWriter.Enqueue(TransactionEventTypes.UserNotificationRequested, subjectId: targetUserId, payload: new
        {
            targetUserId,
            notificationType,
            title,
            message,
            resourceType,
            resourceId,
            occurredAt = clock.UtcNow,
        });
    }
}
