using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Audit.GetAuditLogs;

public sealed record AuditLogResponse(
    string Id,
    string? ActorId,
    string? ActorRole,
    string Action,
    string SourceService,
    string? ResourceType,
    string? ResourceId,
    string? IpAddress,
    string Result,
    DateTimeOffset OccurredAt,
    string? DetailsJson);

/// <summary>
/// <c>GET /api/v1/audit-logs</c> ve <c>/audit-logs/{auditId}</c> (dokuman §22/§32).
/// Yalnizca admin sorgulayabilir. Kayitlar append-only'dir; bu endpoint yalnizca okur.
/// </summary>
public static class GetAuditLogsEndpoint
{
    public static void MapGetAuditLogs(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/audit-logs", ListAsync)
           .WithName("GetAuditLogs").WithTags("Audit")
           .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));

        app.MapGet("/api/v1/audit-logs/{auditId}", GetByIdAsync)
           .WithName("GetAuditLog").WithTags("Audit")
           .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));
    }

    private static async Task<IResult> ListAsync(
        IdentityServiceDbContext db,
        HttpContext httpContext,
        CorrelationContext correlation,
        CancellationToken cancellationToken,
        string? actorId = null,
        string? action = null,
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        int limit = 50)
    {
        limit = Math.Clamp(limit, 1, 100);

        if (from is not null && to is not null && from >= to)
        {
            throw AppException.Validation("'from' degeri 'to' degerinden kucuk olmalidir.");
        }

        var query = db.AuditLogs.AsNoTracking().OrderByDescending(e => e.OccurredAt).AsQueryable();

        if (!string.IsNullOrWhiteSpace(actorId))
        {
            query = query.Where(e => e.ActorId == actorId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(e => e.Action == action);
        }

        if (from is not null)
        {
            query = query.Where(e => e.OccurredAt >= from);
        }

        if (to is not null)
        {
            query = query.Where(e => e.OccurredAt <= to);
        }

        var items = await query
            .Take(limit + 1)
            .Select(e => new AuditLogResponse(
                e.Id, e.ActorId, e.ActorRole, e.Action, e.SourceService, e.ResourceType, e.ResourceId,
                e.IpAddress, e.Result.ToString(), e.OccurredAt, e.DetailsJson))
            .ToListAsync(cancellationToken);

        var hasMore = items.Count > limit;
        var page = new PageInfo(null, hasMore, limit);

        httpContext.Response.Headers.CacheControl = "no-store";
        return ApiResults.Ok(new CursorPage<AuditLogResponse>(items.Take(limit).ToList(), page), correlation);
    }

    private static async Task<IResult> GetByIdAsync(
        string auditId, IdentityServiceDbContext db, HttpContext httpContext, CorrelationContext correlation, CancellationToken cancellationToken)
    {
        var entry = await db.AuditLogs.AsNoTracking().SingleOrDefaultAsync(e => e.Id == auditId, cancellationToken)
            ?? throw AppException.NotFound();

        httpContext.Response.Headers.CacheControl = "no-store";
        return ApiResults.Ok(
            new AuditLogResponse(entry.Id, entry.ActorId, entry.ActorRole, entry.Action, entry.SourceService,
                entry.ResourceType, entry.ResourceId, entry.IpAddress, entry.Result.ToString(), entry.OccurredAt, entry.DetailsJson),
            correlation);
    }
}
