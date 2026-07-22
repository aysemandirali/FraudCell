namespace FraudCell.Identity.Service.Domain;

/// <summary>
/// Refresh token family takibi (dokuman §6). Her rotation'da yeni bir satir
/// olusur ve eskisi <see cref="ReplacedById"/> ile isaretlenir. Revoke edilmis
/// bir token tekrar kullanilirsa <see cref="ReuseDetectedAt"/> doldurulur ve
/// ayni <see cref="FamilyId"/>'ye sahip TUM satirlar revoke edilir.
/// </summary>
public sealed class RefreshSession
{
    public required string Id { get; set; }

    public required string UserId { get; set; }

    public required string FamilyId { get; set; }

    /// <summary>SHA-256(raw token). Ham token veritabaninda asla saklanmaz.</summary>
    public required string TokenHash { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public required DateTimeOffset ExpiresAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }

    public string? ReplacedById { get; set; }

    public DateTimeOffset? ReuseDetectedAt { get; set; }

    public string? CreatedIp { get; set; }

    public string? UserAgent { get; set; }

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;
}
