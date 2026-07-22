using System.Text.Json;
using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.BuildingBlocks.Time;

namespace FraudCell.BuildingBlocks.Messaging.Outbox;

/// <summary>
/// Event'leri outbox'a yazan tek nokta.
///
/// Bilincli olarak <c>SaveChangesAsync</c> CAGIRMAZ. Cagiran kod, business
/// degisikligiyle event'i ayni transaction'da commit etmek zorundadir — outbox
/// pattern'in tum degeri budur.
/// </summary>
public sealed class OutboxWriter(
    IMessagingDbContext dbContext,
    CorrelationContext correlation,
    IClock clock,
    ServiceIdentity serviceIdentity)
{
    /// <summary>
    /// Event'i outbox'a ekler. Kayit, cagiranin <c>SaveChangesAsync</c>'i ile birlikte commit olur.
    /// </summary>
    /// <param name="eventType">Ornegin <c>transaction.created</c>. Routing key olarak da kullanilir.</param>
    /// <param name="subjectId">Event'in ana domain nesnesi (transaction id, case id, ...).</param>
    /// <param name="payload">Event'e ozel veri.</param>
    /// <param name="eventVersion">Payload sema surumu.</param>
    /// <param name="occurredAt">Domain olayinin gerceklestigi an. Verilmezse simdi.</param>
    /// <returns>Uretilen event kimligi (ULID).</returns>
    public string Enqueue(
        string eventType,
        string subjectId,
        object payload,
        int eventVersion = 1,
        DateTimeOffset? occurredAt = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(eventType);
        ArgumentException.ThrowIfNullOrWhiteSpace(subjectId);
        ArgumentNullException.ThrowIfNull(payload);

        var eventId = Ulid.NewUlid().ToString();

        dbContext.OutboxMessages.Add(new OutboxMessage
        {
            Id = eventId,
            EventType = eventType,
            EventVersion = eventVersion,
            // Topic exchange'de routing key event tipinin kendisidir; consumer'lar
            // "case.*" gibi pattern'lerle baglanabilir.
            RoutingKey = $"{eventType}.v{eventVersion}",
            SubjectId = subjectId,
            CorrelationId = correlation.CorrelationId,
            CausationId = correlation.CausationId,
            Producer = serviceIdentity.Name,
            OccurredAt = occurredAt ?? clock.UtcNow,
            Payload = JsonSerializer.Serialize(payload, payload.GetType(), JsonDefaults.Events),
            PublishedAt = null,
            AttemptCount = 0,
            // Publisher hemen alsin diye gecmis bir zaman.
            NextAttemptAt = clock.UtcNow,
        });

        return eventId;
    }
}

/// <summary>Servisin event'lerde kendini tanittigi ad (<c>producer</c> alani).</summary>
public sealed record ServiceIdentity(string Name);
