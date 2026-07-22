using FraudCell.BuildingBlocks.Messaging;
using FraudCell.BuildingBlocks.Messaging.Inbox;
using FraudCell.BuildingBlocks.Messaging.RabbitMq;
using FraudCell.BuildingBlocks.Time;
using FraudCell.Gamification.Service.Common;
using FraudCell.Gamification.Service.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FraudCell.Gamification.Service.Messaging;

public sealed record CustomerFeedbackSubmittedPayload(
    string CaseId, string TransactionId, string CustomerId, string? AnalystId, string? FinalDecision, int Rating, DateTimeOffset SubmittedAt);

/// <summary>
/// <c>customer.feedback.submitted</c> tuketicisi. Bir vaka BLOKLANDI olarak
/// karar verildiginde musteri cok dusuk puan verirse (1-2 yildiz) bu, analistin
/// yanlis pozitif karar verdigine dair dolayli bir sinyal olarak yorumlanir
/// (bkz. <see cref="PointRuleEngine"/> sinif yorumu — kesin ground-truth
/// tanimi 11-GAMIFICATION-DESIGN.md'de netlesecek).
/// </summary>
public sealed class CustomerFeedbackSubmittedConsumer(
    RabbitMqConnectionProvider connectionProvider,
    IOptions<RabbitMqOptions> options,
    IServiceScopeFactory scopeFactory,
    IClock clock,
    ILogger<CustomerFeedbackSubmittedConsumer> logger)
    : RabbitMqConsumerHostedService(connectionProvider, options, logger)
{
    private const string ConsumerName = "gamification-service";
    private const int FalsePositiveRatingThreshold = 2;

    protected override string QueueName => "gamification.customer-feedback-submitted";

    protected override IReadOnlyCollection<string> RoutingKeys => [$"{GamificationEventTypes.CustomerFeedbackSubmitted}.v1"];

    protected override async Task HandleAsync(EventEnvelope envelope, CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<GamificationServiceDbContext>();
        var engine = scope.ServiceProvider.GetRequiredService<PointRuleEngine>();

        var alreadyProcessed = await db.InboxMessages.AnyAsync(m => m.EventId == envelope.EventId && m.ConsumerName == ConsumerName, cancellationToken);
        if (alreadyProcessed)
        {
            return;
        }

        var payload = envelope.PayloadAs<CustomerFeedbackSubmittedPayload>();
        var now = clock.UtcNow;

        if (!string.IsNullOrWhiteSpace(payload.AnalystId) && payload.FinalDecision == "BLOCK" && payload.Rating <= FalsePositiveRatingThreshold)
        {
            await engine.ApplyFalsePositivePenaltyAsync(envelope.EventId, payload.AnalystId, payload.CaseId, now, cancellationToken);
        }

        db.InboxMessages.Add(new InboxMessage
        {
            EventId = envelope.EventId,
            ConsumerName = ConsumerName,
            EventType = envelope.EventType,
            ProcessedAt = now,
            CorrelationId = envelope.CorrelationId,
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
