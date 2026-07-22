using FraudCell.BuildingBlocks.Messaging.Inbox;
using FraudCell.BuildingBlocks.Messaging.Outbox;
using FraudCell.BuildingBlocks.Persistence;
using FraudCell.Identity.Service.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Persistence;

/// <summary>
/// Identity Service'in TEK veritabani baglantisi (dokuman §31). Bu servis
/// disinda hicbir servis bu baglanti dizesine erisemez; network izolasyonu
/// docker-compose seviyesinde ayrica uygulanir (dokuman §32).
/// </summary>
public sealed class IdentityServiceDbContext(DbContextOptions<IdentityServiceDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, string>(options), IMessagingDbContext
{
    public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();

    public DbSet<StaffProfile> StaffProfiles => Set<StaffProfile>();

    public DbSet<StaffSpecialty> StaffSpecialties => Set<StaffSpecialty>();

    public DbSet<StaffRegion> StaffRegions => Set<StaffRegion>();

    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();

    public DbSet<RefreshSession> RefreshSessions => Set<RefreshSession>();

    public DbSet<AuditLogEntry> AuditLogEntries => Set<AuditLogEntry>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    public DbSet<InboxMessage> InboxMessages => Set<InboxMessage>();

    DbContext IMessagingDbContext.AsDbContext() => this;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity varsayilan tablo adlarini FraudCell konvansiyonuna cevirir.
        builder.Entity<ApplicationUser>().ToTable("users");
        builder.Entity<ApplicationRole>().ToTable("roles");
        builder.Entity<IdentityUserRole<string>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<string>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<string>>().ToTable("user_logins");
        builder.Entity<IdentityUserToken<string>>().ToTable("user_tokens");
        builder.Entity<IdentityRoleClaim<string>>().ToTable("role_claims");

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(e => e.Id).HasMaxLength(26);
            entity.Property(e => e.Msisdn).HasMaxLength(20);
            entity.HasIndex(e => e.Msisdn).IsUnique().HasFilter("msisdn IS NOT NULL");
        });

        builder.Entity<CustomerProfile>(entity =>
        {
            entity.ToTable("customer_profiles");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasMaxLength(26);
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(256);

            entity.HasOne(e => e.User)
                  .WithOne(u => u.CustomerProfile)
                  .HasForeignKey<CustomerProfile>(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<StaffProfile>(entity =>
        {
            entity.ToTable("staff_profiles");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasMaxLength(26);
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CreatedByUserId).HasMaxLength(26).IsRequired();
            entity.Property(e => e.Version).IsRowVersion();

            entity.HasOne(e => e.User)
                  .WithOne(u => u.StaffProfile)
                  .HasForeignKey<StaffProfile>(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Specialties)
                  .WithOne()
                  .HasForeignKey(e => e.StaffProfileUserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(e => e.Regions)
                  .WithOne()
                  .HasForeignKey(e => e.StaffProfileUserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<StaffSpecialty>(entity =>
        {
            entity.ToTable("staff_specialties");
            entity.HasKey(e => new { e.StaffProfileUserId, e.Specialty });
            entity.Property(e => e.StaffProfileUserId).HasMaxLength(26);
            entity.Property(e => e.Specialty).HasConversion<string>().HasMaxLength(50);
        });

        builder.Entity<StaffRegion>(entity =>
        {
            entity.ToTable("staff_regions");
            entity.HasKey(e => new { e.StaffProfileUserId, e.Region });
            entity.Property(e => e.StaffProfileUserId).HasMaxLength(26);
            entity.Property(e => e.Region).HasConversion<string>().HasMaxLength(50);
        });

        builder.Entity<OtpChallenge>(entity =>
        {
            entity.ToTable("otp_challenges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(26);
            entity.Property(e => e.Msisdn).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Purpose).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CodeHash).HasMaxLength(128).IsRequired();

            // Aktif (tuketilmemis) OTP'yi msisdn+purpose ile hizli bulmak icin.
            entity.HasIndex(e => new { e.Msisdn, e.Purpose, e.ExpiresAt })
                  .HasDatabaseName("ix_otp_lookup");
        });

        builder.Entity<RefreshSession>(entity =>
        {
            entity.ToTable("refresh_sessions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(26);
            entity.Property(e => e.UserId).HasMaxLength(26).IsRequired();
            entity.Property(e => e.FamilyId).HasMaxLength(26).IsRequired();
            entity.Property(e => e.TokenHash).HasMaxLength(128).IsRequired();
            entity.Property(e => e.CreatedIp).HasMaxLength(64);
            entity.Property(e => e.UserAgent).HasMaxLength(300);

            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.HasIndex(e => e.FamilyId).HasDatabaseName("ix_refresh_sessions_family");
            entity.HasIndex(e => e.UserId).HasDatabaseName("ix_refresh_sessions_user");
        });

        builder.Entity<AuditLogEntry>(entity =>
        {
            entity.ToTable("audit_log_entries");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(26);
            entity.Property(e => e.ActorId).HasMaxLength(26);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.SourceService).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ResourceType).HasMaxLength(50);
            entity.Property(e => e.ResourceId).HasMaxLength(64);
            entity.Property(e => e.IpAddress).HasMaxLength(64);
            entity.Property(e => e.Result).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.CorrelationId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.DetailsJson).HasColumnType("jsonb");

            // Audit sorgulari genellikle zaman ve/veya aktore gore filtrelenir.
            entity.HasIndex(e => e.OccurredAt).HasDatabaseName("ix_audit_occurred_at");
            entity.HasIndex(e => e.ActorId).HasDatabaseName("ix_audit_actor_id");

            // Append-only: API bu tabloya UPDATE/DELETE uretmez (dokuman §18).
        });

        builder.ApplyMessagingModel();
        builder.ApplySnakeCaseNaming();
    }
}
