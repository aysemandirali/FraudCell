using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Tum servisler ayni JSON davranisini kullanir: camelCase alanlar, enum'lar string.
///
/// Enum'larda KASITLI olarak naming policy YOKTUR. C# enum uyeleri wire formatiyla
/// birebir ayni yazilir (<c>CALINTI_KART</c>, <c>MUSTERI_DOGRULAMA</c>), boylece
/// donusum deterministik olur ve Turkce/underscore iceren degerlerde surpriz cikmaz.
/// </summary>
public static class JsonDefaults
{
    public static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
            // Frontend "riskScore === null" gibi ayrimlar yaptigi icin
            // null alanlar cevaptan DUSURULMEZ.
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
            NumberHandling = JsonNumberHandling.Strict,
            // Turkce karakterler (s, i, g) \uXXXX olarak kacilmasin.
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };

        options.Converters.Add(new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false));
        return options;
    }

    /// <summary>Event zarfi ve payload'lari icin ortak ayarlar.</summary>
    public static readonly JsonSerializerOptions Events = CreateEventOptions();

    private static JsonSerializerOptions CreateEventOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
        options.Converters.Add(new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false));
        return options;
    }
}
