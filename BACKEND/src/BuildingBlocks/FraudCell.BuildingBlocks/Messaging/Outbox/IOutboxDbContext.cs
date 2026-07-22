using FraudCell.BuildingBlocks.Messaging.Inbox;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.BuildingBlocks.Messaging.Outbox;

/// <summary>
/// Outbox publisher ve inbox kontrolu, servisin somut DbContext tipini bilmeden
/// calisabilmelidir. Her servisin DbContext'i bu arayuzu uygular.
/// </summary>
public interface IMessagingDbContext
{
    DbSet<OutboxMessage> OutboxMessages { get; }

    DbSet<InboxMessage> InboxMessages { get; }

    DbContext AsDbContext();
}
