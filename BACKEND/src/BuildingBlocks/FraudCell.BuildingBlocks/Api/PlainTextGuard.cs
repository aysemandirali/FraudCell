namespace FraudCell.BuildingBlocks.Api;

/// <summary>Serbest metin alanlarinda HTML kabul edilmemesi kuralini uygular (dokuman §6.6).</summary>
public static class PlainTextGuard
{
    public static bool ContainsHtml(string value) => value.IndexOfAny(['<', '>']) >= 0;
}
