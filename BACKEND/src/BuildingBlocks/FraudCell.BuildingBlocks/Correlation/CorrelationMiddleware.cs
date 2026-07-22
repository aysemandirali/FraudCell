using Microsoft.AspNetCore.Http;
using Serilog.Context;

namespace FraudCell.BuildingBlocks.Correlation;

/// <summary>
/// Her istege bir correlation ID baglar, log scope'una yazar ve cevaba geri koyar.
/// Pipeline'in en basinda calismalidir; hata loglari da bu ID'yi tasimalidir.
/// </summary>
public sealed class CorrelationMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, CorrelationContext correlation)
    {
        var incoming = context.Request.Headers[CorrelationId.HeaderName].FirstOrDefault();
        var id = CorrelationId.Sanitize(incoming);

        correlation.Set(id);
        context.TraceIdentifier = id;

        // Response header'i yanit baslamadan once yazilmali.
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[CorrelationId.HeaderName] = id;
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("correlationId", id))
        {
            await next(context);
        }
    }
}
