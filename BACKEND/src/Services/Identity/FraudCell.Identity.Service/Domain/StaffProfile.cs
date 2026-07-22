using FraudCell.Identity.Service.Common;

namespace FraudCell.Identity.Service.Domain;

/// <summary>
/// Personel profili (dokuman §7.2). Uzmanlik ve bolge coktan-coge iliskilerdir;
/// AI Service bunlari <c>identity.staff.profile.updated</c> event'iyle projection
/// olarak alir (dokuman §7.8).
/// </summary>
public sealed class StaffProfile
{
    public required string UserId { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string CreatedByUserId { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Optimistic concurrency: profil guncellemesi ile event yayinini eslestirmek icin.</summary>
    public uint Version { get; set; }

    public ApplicationUser User { get; set; } = null!;

    public List<StaffSpecialty> Specialties { get; set; } = [];

    public List<StaffRegion> Regions { get; set; } = [];
}

public sealed class StaffSpecialty
{
    public required string StaffProfileUserId { get; set; }

    public required AnalystSpecialty Specialty { get; set; }
}

public sealed class StaffRegion
{
    public required string StaffProfileUserId { get; set; }

    public required OperationRegion Region { get; set; }
}
