using FraudCell.BuildingBlocks.Time;
using FraudCell.Transaction.Service.Domain;

namespace FraudCell.Transaction.Service.Features.Cases;

public static class CaseProjector
{
    public static CaseResponse Project(RiskCase riskCase, Domain.FraudTransaction transaction, IClock clock)
    {
        var now = clock.UtcNow;
        var slaStatus = CaseSlaStatusCalculator.Calculate(now, riskCase.SlaStartedAt, riskCase.SlaDeadlineAt, riskCase.SlaBreachedAt);
        var remaining = Math.Max(0, (int)(riskCase.SlaDeadlineAt - now).TotalSeconds);

        return new CaseResponse(
            riskCase.Id,
            new CaseTransactionSummaryResponse(
                transaction.Id, transaction.TransactionNo, transaction.Amount, transaction.Currency, transaction.TransactionType.ToString(),
                transaction.RecipientReference, transaction.City, transaction.CountryCode, transaction.OccurredAt, transaction.ControlStatus.ToString()),
            riskCase.Status.ToString(),
            riskCase.AssignmentStatus.ToString(),
            riskCase.AssignedAnalystId,
            new CaseEffectiveRiskResponse(
                riskCase.EffectiveRiskScore, riskCase.EffectiveRiskLevel?.ToString(), riskCase.EffectiveFraudType?.ToString(),
                riskCase.EffectiveFraudType != transaction.EffectiveFraudType || riskCase.EffectiveRiskLevel != transaction.EffectiveRiskLevel),
            riskCase.FinalDecision?.ToString(),
            riskCase.DecisionNote,
            new CaseSlaResponse(riskCase.SlaPriority.ToString(), riskCase.SlaStartedAt, riskCase.SlaDeadlineAt, riskCase.SlaBreachedAt, riskCase.SlaStoppedAt, slaStatus, remaining),
            riskCase.Version,
            riskCase.CreatedAt,
            riskCase.UpdatedAt);
    }
}
