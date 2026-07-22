namespace FraudCell.BuildingBlocks.Time;

/// <summary>
/// SLA, token suresi ve hesap kilidi hesaplari sistem saatine dogrudan
/// baglanmaz (dokuman §36). Testlerde saat ileri sarilabilir olmalidir.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
