using FraudCell.Transaction.Service.Domain;
using Shouldly;
using Xunit;

namespace FraudCell.Transaction.Service.Tests;

public sealed class RiskThresholdsTests
{
    [Theory]
    [InlineData("0.39999", ScreeningDecision.ONAY, RiskLevel.DUSUK)]
    [InlineData("0.40000", ScreeningDecision.INCELEME, RiskLevel.ORTA)]
    [InlineData("0.69999", ScreeningDecision.INCELEME, RiskLevel.ORTA)]
    [InlineData("0.70000", ScreeningDecision.INCELEME, RiskLevel.YUKSEK)]
    [InlineData("0.90000", ScreeningDecision.INCELEME, RiskLevel.YUKSEK)]
    [InlineData("0.90001", ScreeningDecision.BLOK, RiskLevel.KRITIK)]
    public void Exact_boundaries_match_the_case_document(
        string rawScore,
        ScreeningDecision expectedDecision,
        RiskLevel expectedLevel)
    {
        var score = decimal.Parse(rawScore, System.Globalization.CultureInfo.InvariantCulture);

        RiskThresholds.MapDecision(score).ShouldBe(expectedDecision);
        RiskThresholds.MapRiskLevel(score).ShouldBe(expectedLevel);
    }
}
