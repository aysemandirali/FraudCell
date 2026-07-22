using System.Net;
using System.Text.Json;
using FraudCell.BuildingBlocks.Correlation;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Tek hata cikis noktasi. Her hata dokuman §19'daki zarf formatinda doner ve
/// <c>meta.traceId</c> tasir (API-013).
///
/// Beklenmeyen hatalarda istemciye stack trace veya exception mesaji SIZDIRILMAZ;
/// detay yalnizca sunucu logunda kalir.
/// </summary>
public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    JsonSerializerOptions jsonOptions)
{
    public async Task InvokeAsync(HttpContext context, CorrelationContext correlation)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            // Beklenen domain/uygulama hatasi: Warning seviyesinde, stack trace'siz.
            logger.LogWarning(
                "Handled application error {ErrorCode} on {Method} {Path}: {ErrorMessage}",
                ex.Code, context.Request.Method, context.Request.Path, ex.Message);

            await WriteAsync(context, ex.StatusCode, new ApiError(ex.Code, ex.Message, ex.Details), correlation);
        }
        catch (DbUpdateConcurrencyException ex)
        {
            // Optimistic concurrency: iki analist ayni vakaya ayni anda karar verdi (CASE-013).
            logger.LogWarning(ex, "Concurrency conflict on {Method} {Path}", context.Request.Method, context.Request.Path);

            await WriteAsync(
                context,
                HttpStatusCode.Conflict,
                new ApiError(
                    ErrorCodes.ConcurrencyConflict,
                    "Kayit siz islem yaparken baskasi tarafindan degistirildi. Sayfayi yenileyip tekrar deneyin."),
                correlation);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Istemci baglantiyi kapatti; bu bir hata degil, loglamaya deger bilgi degil.
            logger.LogDebug("Request aborted by client: {Method} {Path}", context.Request.Method, context.Request.Path);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            await WriteAsync(
                context,
                HttpStatusCode.InternalServerError,
                new ApiError(ErrorCodes.InternalError, "Beklenmeyen bir hata olustu."),
                correlation);
        }
    }

    private async Task WriteAsync(
        HttpContext context,
        HttpStatusCode status,
        ApiError error,
        CorrelationContext correlation)
    {
        if (context.Response.HasStarted)
        {
            // Cevap govdesi akmaya baslamis (ornegin SSE); zarf yazamayiz.
            logger.LogWarning("Response already started; cannot write error envelope for {ErrorCode}", error.Code);
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = (int)status;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = ApiResponse.Failure(error, correlation.CorrelationId);
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, jsonOptions), context.RequestAborted);
    }
}
