using System.Security.Claims;
using FraudCell.BuildingBlocks.Api;
using FraudCell.BuildingBlocks.Correlation;
using FraudCell.Identity.Service.Common;
using FraudCell.Identity.Service.Domain;
using FraudCell.Identity.Service.Persistence;
using FraudCell.Identity.Service.Security;

namespace FraudCell.Identity.Service.Features.Auth.Logout;

/// <summary>Yalnizca sunulan oturumu iptal eder (dokuman §7.1 IDN-027).</summary>
public static class LogoutEndpoint
{
    public static void MapLogout(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/auth/logout", HandleAsync)
           .WithName("Logout")
           .WithTags("Auth")
           .RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        HttpContext httpContext,
        RefreshTokenService refreshTokenService,
        AuditWriter auditWriter,
        IdentityServiceDbContext db,
        CorrelationContext correlation,
        CancellationToken cancellationToken)
    {
        var rawToken = RefreshCookie.Read(httpContext.Request);
        if (rawToken is not null)
        {
            await refreshTokenService.RevokeAsync(rawToken, cancellationToken);
        }

        RefreshCookie.Clear(httpContext.Response);

        var actorId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? httpContext.User.FindFirstValue("sub");

        auditWriter.Record(actorId, AuditActions.Logout, AuditResult.Success, "user", actorId,
            RefreshCookie.GetClientIp(httpContext));
        await db.SaveChangesAsync(cancellationToken);

        return ApiResults.Empty(correlation);
    }
}
