using Microsoft.AspNetCore.Identity;

namespace FraudCell.Identity.Service.Domain;

/// <summary>Dokuman `06-DATA-ARCHITECTURE.md` §9.2 <c>user_type</c> alani.</summary>
public enum UserType
{
    Customer,
    Staff,
}

/// <summary>
/// <c>identity.users</c> tablosunun karsiligi (dokuman §9). ASP.NET Core
/// Identity'nin User persistence, password validation ve account lockout
/// altyapisini kullanir (dokuman `03-TECH-STACK.md` §8.2); GSM+OTP, JWT ve
/// custom kolonlar (user_type, gsm_number, is_active, ...) bunun uzerine eklenir.
///
/// Id kasitli olarak ULID'dir (Guid degil): dokuman §37 tum internal
/// kimliklerin ULID olmasini sart kosar.
/// </summary>
public sealed class ApplicationUser : IdentityUser<string>
{
    public ApplicationUser()
    {
        Id = Ulid.NewUlid().ToString();
    }

    public required UserType UserType { get; set; }

    /// <summary>Normalize edilmis E.164 benzeri GSM (dokuman §9.2 <c>gsm_number</c>). Personelde null.</summary>
    public string? GsmNumber { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? LastLoginAt { get; set; }

    /// <summary>Hesap pasif hale getirildiginde (ornegin personel ayrildiginda) login reddedilir.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>API seviyesinde optimistic concurrency icin (dokuman §9.2/§7.1). Her mutasyonda +1 artar.</summary>
    public long Version { get; set; }

    public CustomerProfile? CustomerProfile { get; set; }

    public StaffProfile? StaffProfile { get; set; }
}
