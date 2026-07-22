using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Time;

namespace FraudCell.Gamification.Service.Common;

public sealed class CrossCuttingEventPublisher(OutboxWriter outboxWriter, IClock clock)
{
    public void PublishAudit(string? actorId, string action, string result, string? resourceType, string? resourceId, object? details = null)
    {
        outboxWriter.Enqueue(GamificationEventTypes.AuditEntryRequested, subjectId: resourceId ?? actorId ?? "system", payload: new
        {
            actorId,
            actorRole = (string?)null,
            action,
            sourceService = "gamification-service",
            resourceType,
            resourceId,
            ipAddress = (string?)null,
            result,
            occurredAt = clock.UtcNow,
            details,
        });
    }

    public void PublishNotification(string targetUserId, string notificationType, string title, string message, string? resourceType, string? resourceId)
    {
        outboxWriter.Enqueue(GamificationEventTypes.UserNotificationRequested, subjectId: targetUserId, payload: new
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
