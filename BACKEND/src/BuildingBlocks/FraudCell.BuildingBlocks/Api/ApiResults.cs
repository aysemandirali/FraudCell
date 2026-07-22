using FraudCell.BuildingBlocks.Correlation;
using Microsoft.AspNetCore.Http;

namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Minimal API endpoint'lerinin zarf uretmesini tek satira indirir.
/// Endpoint'ler asla ham nesne dondurmez; her zaman bu yardimcilardan gecer.
/// </summary>
public static class ApiResults
{
    public static IResult Ok<T>(T data, CorrelationContext correlation)
        => Results.Ok(ApiResponse<T>.Ok(data, correlation.CorrelationId));

    public static IResult Created<T>(string location, T data, CorrelationContext correlation)
        => Results.Created(location, ApiResponse<T>.Ok(data, correlation.CorrelationId));

    public static IResult Accepted<T>(T data, CorrelationContext correlation)
        => Results.Accepted(value: ApiResponse<T>.Ok(data, correlation.CorrelationId));

    /// <summary>204 yerine bos data'li 200 doneriz; frontend zarfi her zaman ayni sekilde parse eder.</summary>
    public static IResult Empty(CorrelationContext correlation)
        => Results.Ok(ApiResponse<object?>.Ok(null, correlation.CorrelationId));
}
