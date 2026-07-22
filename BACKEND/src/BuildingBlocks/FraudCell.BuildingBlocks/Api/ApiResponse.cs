using System.Text.Json.Serialization;

namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Dokuman §19'daki standart cevap zarfi. Frontend'in <c>ApiEnvelope&lt;T&gt;</c>
/// tipiyle birebir eslesir; alan adlari degistirilemez.
/// </summary>
public sealed record ApiResponse<T>
{
    [JsonPropertyOrder(0)]
    public required bool Success { get; init; }

    [JsonPropertyOrder(1)]
    public T? Data { get; init; }

    [JsonPropertyOrder(2)]
    public ApiError? Error { get; init; }

    [JsonPropertyOrder(3)]
    public required ApiMeta Meta { get; init; }

    public static ApiResponse<T> Ok(T data, string traceId) => new()
    {
        Success = true,
        Data = data,
        Error = null,
        Meta = new ApiMeta(traceId),
    };
}

/// <summary>Data tasimayan basarili cevaplar icin.</summary>
public sealed record ApiResponse
{
    [JsonPropertyOrder(0)]
    public required bool Success { get; init; }

    [JsonPropertyOrder(1)]
    public object? Data { get; init; }

    [JsonPropertyOrder(2)]
    public ApiError? Error { get; init; }

    [JsonPropertyOrder(3)]
    public required ApiMeta Meta { get; init; }

    public static ApiResponse Failure(ApiError error, string traceId) => new()
    {
        Success = false,
        Data = null,
        Error = error,
        Meta = new ApiMeta(traceId),
    };
}

public sealed record ApiError(
    string Code,
    string Message,
    IReadOnlyDictionary<string, object?>? Details = null);

public sealed record ApiMeta(string TraceId);
