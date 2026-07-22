using FraudCell.BuildingBlocks.Messaging.Inbox;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.BuildingBlocks.Messaging.Outbox;

/// <summary>
/// Outbox/inbox tablolarinin sema tanimi. Her servis kendi DbContext'inde bunu
/// cagirir; tablolar servisin KENDI veritabaninda yasar (paylasimli tablo yoktur).
/// </summary>
public static class MessagingModelBuilderExtensions
{
    public static ModelBuilder ApplyMessagingModel(this ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.ToTable("outbox_messages");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(26);
            entity.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RoutingKey).HasMaxLength(150).IsRequired();
            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.CorrelationId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.CausationId).HasMaxLength(64);
            entity.Property(e => e.Producer).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Payload).HasColumnType("jsonb").IsRequired();
            entity.Property(e => e.LastError).HasMaxLength(2000);

            // Publisher'in tek sorgusu: "yayinlanmamis ve zamani gelmis kayitlar".
            // Partial index, yayinlanmis milyonlarca satiri indeksin disinda tutar.
            entity.HasIndex(e => new { e.NextAttemptAt, e.OccurredAt })
                  .HasDatabaseName("ix_outbox_pending")
                  .HasFilter("published_at IS NULL");
        });

        modelBuilder.Entity<InboxMessage>(entity =>
        {
            entity.ToTable("inbox_messages");

            // Bilesik anahtar: ayni event'i farkli consumer'lar bagimsiz isleyebilir.
            entity.HasKey(e => new { e.EventId, e.ConsumerName });

            entity.Property(e => e.EventId).HasMaxLength(64);
            entity.Property(e => e.ConsumerName).HasMaxLength(100);
            entity.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CorrelationId).HasMaxLength(64).IsRequired();

            // Temizlik worker'i eski kayitlari tarihe gore siler.
            entity.HasIndex(e => e.ProcessedAt).HasDatabaseName("ix_inbox_processed_at");
        });

        return modelBuilder;
    }
}
