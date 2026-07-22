using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FraudCell.Identity.Service.Features.Audit.GetAuditLogs;

public sealed record AuditLogEntryResponse(
    string Id,
    string? ActorId,
    string Action,
    string SourceService,
    string? ResourceType,
    string? ResourceId,
    string? IpAddress,
    string Result,
    DateTimeOffset OccurredAt,
    string CorrelationId);

public sealed record AuditLogPageResponse(IReadOnlyCollection<AuditLogEntryResponse> Items, int Page, int PageSize, int TotalCount);

/// <summary>
/// Yalnizca admin audit log sorgulayabilir (dokuman §7.4/ROLE-013). Kayitlar
/// append-only'dir; bu endpoint yalnizca okuma yapar (dokuman §18).
/// </summary>
public static class GetAuditLogsEndpoint
{
    public static void MapGetAuditLogs(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/audit-logs", HandleAsync)
           .WithName("GetAuditLogs")
           .WithTags("Audit")
           .RequireAuthorization(policy => policy.RequireRole(RoleNames.Admin));
    }

    private static async Task<IResult> HandleAsync(
        IdentityServiceDbContext db,
        CorrelationContext correlation,
        CancellationToken cancellationToken,
        string? actorId = null,
        string? action = null,
        int page = 1,
        int pageSize = 50)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = db.AuditLogEntries.AsNoTracking().OrderByDescending(e => e.OccurredAt).AsQueryable();

        if (!string.IsNullOrWhiteSpace(actorId))
        {
            query = query.Where(e => e.ActorId == actorId);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(e => e.Action == action);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AuditLogEntryResponse(
                e.Id, e.ActorId, e.Action, e.SourceService, e.ResourceType, e.ResourceId,
                e.IpAddress, e.Result.ToString(), e.OccurredAt, e.CorrelationId))
            .ToListAsync(cancellationToken);

        return ApiResults.Ok(new AuditLogPageResponse(items, page, pageSize, totalCount), correlation);
    }
}
