namespace FraudCell.Transaction.Service.Common;

/// <summary>Dokuman `02-ARCHITECTURE-OVERVIEW.md` §17: <c>AI_ASSESSMENT_DEADLINE_SECONDS</c>.</summary>
public sealed class AssessmentOptions
{
    public const string SectionName = "Assessment";

    public int DeadlineSeconds { get; set; } = 2;

    /// <summary>Dokuman §22 muşteri dogrulama timeout'u.</summary>
    public int CustomerVerificationTimeoutMinutes { get; set; } = 10;
}
