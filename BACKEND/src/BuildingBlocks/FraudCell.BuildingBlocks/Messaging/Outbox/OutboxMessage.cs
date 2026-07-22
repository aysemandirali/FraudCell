namespace FraudCell.BuildingBlocks.Messaging.Outbox;

/// <summary>
/// Transactional outbox kaydi (dokuman §15).
///
/// Kritik kural: bu satir, kendisini doguran business degisikligiyle AYNI
/// database transaction'inda yazilir. Boylece "veri yazildi ama event kayboldu"
/// (dual-write) durumu olusamaz.
/// </summary>
public sealed class OutboxMessage
{
    /// <summary>Event kimligi (ULID). Broker'a giden zarftaki <c>eventId</c> ile aynidir.</summary>
    public required string Id { get; set; }

    public required string EventType { get; set; }

    public required int EventVersion { get; set; }

    /// <summary>Topic exchange routing key. Genellikle EventType ile aynidir.</summary>
    public required string RoutingKey { get; set; }

    public required string SubjectId { get; set; }

    public required string CorrelationId { get; set; }

    public string? CausationId { get; set; }

    public required string Producer { get; set; }

    /// <summary>Event'in domain seviyesinde gerceklestigi an (broker'a verildigi an degil).</summary>
    public required DateTimeOffset OccurredAt { get; set; }

    /// <summary>Serialize edilmis payload. PostgreSQL tarafinda jsonb.</summary>
    public required string Payload { get; set; }

    /// <summary>Publisher confirm alindiktan SONRA doldurulur. Null ise event hala bekliyordur.</summary>
    public DateTimeOffset? PublishedAt { get; set; }

    public int AttemptCount { get; set; }

    public DateTimeOffset? NextAttemptAt { get; set; }

    /// <summary>Son yayin denemesinin hatasi. Operasyon ekraninda teshis icin tutulur.</summary>
    public string? LastError { get; set; }
}
