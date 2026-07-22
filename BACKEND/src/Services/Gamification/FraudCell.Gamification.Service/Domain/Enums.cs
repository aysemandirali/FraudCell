namespace FraudCell.Gamification.Service.Domain;

/// <summary>Dokuman `06-DATA-ARCHITECTURE.md` §49.2.</summary>
public static class RuleCodes
{
    public const string CaseDecision = "CASE_DECISION";
    public const string FastDecision = "FAST_DECISION";
    public const string ConfirmedFraud = "CONFIRMED_FRAUD";
    public const string CriticalWithinSla = "CRITICAL_WITHIN_SLA";
    public const string SlaBreach = "SLA_BREACH";
    public const string FalsePositive = "FALSE_POSITIVE";
}

public enum RuleEvaluationResult
{
    APPLIED,
    NOT_APPLICABLE,
    ALREADY_APPLIED,
    DEFERRED,
}

/// <summary>Dokuman §53. Seviye siniri: BRONZ 0-499, GUMUS 500-1499, ALTIN 1500-2999, PLATIN 3000+.</summary>
public enum AnalystLevel
{
    BRONZ,
    GUMUS,
    ALTIN,
    PLATIN,
}

public static class LevelThresholds
{
    public static AnalystLevel Calculate(long totalPoints) => totalPoints switch
    {
        >= 3000 => AnalystLevel.PLATIN,
        >= 1500 => AnalystLevel.ALTIN,
        >= 500 => AnalystLevel.GUMUS,
        _ => AnalystLevel.BRONZ,
    };
}

/// <summary>Dokuman `00-START-HERE.md` §7.3 seed badge kodlari.</summary>
public static class BadgeCodes
{
    public const string FirstCatch = "FIRST_CATCH";
    public const string SharpEye = "SHARP_EYE";
    public const string ZeroError = "ZERO_ERROR";
    public const string Marathon = "MARATHON";
    public const string CrisisManager = "CRISIS_MANAGER";
    public const string SpecialistHunter = "SPECIALIST_HUNTER";
}
