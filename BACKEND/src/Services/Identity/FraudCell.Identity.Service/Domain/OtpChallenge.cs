namespace FraudCell.Identity.Service.Domain;

public enum OtpPurpose
{
    Registration,
    Login,
}

/// <summary>
/// GSM + OTP dogrulamasi (dokuman §7.1 IDN-002/003). Kod hash'i saklanir, ham
/// deger asla veritabaninda tutulmaz; demo profilinde sabit "1234" kabul edilir.
/// </summary>
public sealed class OtpChallenge
{
    public required string Id { get; set; }

    public required string Msisdn { get; set; }

    public required OtpPurpose Purpose { get; set; }

    /// <summary>SHA-256(code + pepper). Ham OTP asla saklanmaz.</summary>
    public required string CodeHash { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public required DateTimeOffset ExpiresAt { get; set; }

    public int AttemptCount { get; set; }

    public DateTimeOffset? ConsumedAt { get; set; }
}
