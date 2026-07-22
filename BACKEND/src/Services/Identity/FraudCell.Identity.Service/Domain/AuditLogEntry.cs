namespace FraudCell.Identity.Service.Domain;

public enum AuditResult
{
    Success,
    Failure,
}

/// <summary>
/// Append-only audit kaydi (dokuman §18/§26). API uzerinden guncellenemez veya
/// silinemez; yalnizca <c>PersistAuditEntry</c> use-case'i ekleme yapar.
/// </summary>
public sealed class AuditLogEntry
{
    public required string Id { get; set; }

    /// <summary>Sistem tarafindan tetiklenen olaylarda (ornegin worker) null olabilir.</summary>
    public string? ActorId { get; set; }

    public required string Action { get; set; }

    public required string SourceService { get; set; }

    public string? ResourceType { get; set; }

    public string? ResourceId { get; set; }

    public string? IpAddress { get; set; }

    public required AuditResult Result { get; set; }

    public required DateTimeOffset OccurredAt { get; set; }

    public required string CorrelationId { get; set; }

    /// <summary>Serbest bicimli ek detay. PostgreSQL'de jsonb.</summary>
    public string? DetailsJson { get; set; }
}
