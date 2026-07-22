using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Standart API zarfinin OpenAPI response semasini endpoint metadata'sina ekler.
/// Handler'lar hata durumlarini exception middleware'e biraktigi icin donus tipi
/// <see cref="IResult"/> olarak gorunur; bu convention olmadan OpenAPI basarili
/// response govdesini cikaramaz.
/// </summary>
public static class ApiEndpointConventionExtensions
{
    public static RouteHandlerBuilder ProducesApi<T>(
        this RouteHandlerBuilder builder,
        int statusCode = StatusCodes.Status200OK)
    {
        builder.Produces<ApiResponse<T>>(statusCode, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status400BadRequest, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status401Unauthorized, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status403Forbidden, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status404NotFound, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status409Conflict, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status429TooManyRequests, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status500InternalServerError, "application/json");
        builder.Produces<ApiResponse>(StatusCodes.Status503ServiceUnavailable, "application/json");
        return builder;
    }
}
