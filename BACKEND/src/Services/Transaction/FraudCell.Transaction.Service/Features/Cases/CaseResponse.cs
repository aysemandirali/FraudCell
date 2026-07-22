namespace FraudCell.Transaction.Service.Features.Cases;

public sealed record CaseSlaResponse(
    string Priority, DateTimeOffset StartedAt, DateTimeOffset DeadlineAt,
    DateTimeOffset? BreachedAt, DateTimeOffset? StoppedAt, string Status, int RemainingSeconds);

public sealed record CaseTransactionSummaryResponse(
    string TransactionId, string TransactionNo, decimal Amount, string Currency, string TransactionType,
    string RecipientReference, string City, string CountryCode, DateTimeOffset OccurredAt, string ControlStatus);

public sealed record CaseEffectiveRiskResponse(decimal? RiskScore, string? RiskLevel, string? FraudType, bool Overridden);

public sealed record CaseResponse(
    string CaseId,
    CaseTransactionSummaryResponse Transaction,
    string Status,
    string AssignmentStatus,
    string? AssignedAnalystId,
    CaseEffectiveRiskResponse EffectiveRisk,
    string? FinalDecision,
    string? DecisionNote,
    CaseSlaResponse Sla,
    long Version,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public static class CaseSlaStatusCalculator
{
    public static string Calculate(DateTimeOffset now, DateTimeOffset startedAt, DateTimeOffset deadlineAt, DateTimeOffset? breachedAt)
    {
        if (breachedAt is not null || now > deadlineAt)
        {
            return "BREACHED";
        }

        var total = (deadlineAt - startedAt).TotalSeconds;
        if (total <= 0)
        {
            return "URGENT";
        }

        var elapsedRatio = (now - startedAt).TotalSeconds / total;
        return elapsedRatio switch
        {
            < 0.75 => "NORMAL",
            < 0.90 => "WARNING",
            _ => "URGENT",
        };
    }
}
