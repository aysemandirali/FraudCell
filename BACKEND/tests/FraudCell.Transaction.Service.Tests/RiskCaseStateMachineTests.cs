using FraudCell.BuildingBlocks.Api;
using FraudCell.Transaction.Service.Domain;
using Shouldly;
using Xunit;

namespace FraudCell.Transaction.Service.Tests;

public sealed class RiskCaseStateMachineTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 23, 0, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Assigned_case_can_be_reviewed_and_blocked_with_a_note()
    {
        var riskCase = NewCase();
        riskCase.StartSla(SlaPriority.YUKSEK, Now);

        riskCase.Assign("analyst-1", Now.AddMinutes(1));
        riskCase.StartReview("analyst-1", isSupervisorOverride: false, Now.AddMinutes(2));
        riskCase.Block("analyst-1", "Doğrulanmış yüksek risk.", Now.AddMinutes(3));

        riskCase.Status.ShouldBe(CaseStatus.BLOKLANDI);
        riskCase.FinalDecision.ShouldBe(FinalDecision.BLOCK);
        riskCase.AssignmentStatus.ShouldBe(AssignmentStatus.COMPLETED);
        riskCase.SlaStoppedAt.ShouldBe(Now.AddMinutes(3));
    }

    [Fact]
    public void Block_without_a_note_is_rejected()
    {
        var riskCase = NewCase();
        riskCase.Assign("analyst-1", Now);
        riskCase.StartReview("analyst-1", isSupervisorOverride: false, Now.AddMinutes(1));

        var error = Should.Throw<AppException>(() =>
            riskCase.Block("analyst-1", " ", Now.AddMinutes(2)));

        error.Code.ShouldBe(ErrorCodes.DecisionNoteRequired);
        riskCase.Status.ShouldBe(CaseStatus.INCELENIYOR);
    }

    [Fact]
    public void Invalid_transition_from_new_directly_to_review_is_rejected()
    {
        var riskCase = NewCase();

        var error = Should.Throw<AppException>(() =>
            riskCase.StartReview("analyst-1", isSupervisorOverride: false, Now));

        error.Code.ShouldBe(ErrorCodes.InvalidCaseTransition);
        riskCase.Status.ShouldBe(CaseStatus.YENI);
    }

    [Fact]
    public void Customer_verification_round_trip_returns_to_review()
    {
        var riskCase = NewCase();
        riskCase.Assign("analyst-1", Now);
        riskCase.StartReview("analyst-1", isSupervisorOverride: false, Now.AddMinutes(1));

        riskCase.RequestCustomerVerification(Now.AddMinutes(2));
        riskCase.Status.ShouldBe(CaseStatus.MUSTERI_DOGRULAMA);

        riskCase.ResumeReviewAfterVerification(Now.AddMinutes(3));
        riskCase.Status.ShouldBe(CaseStatus.INCELENIYOR);
    }

    private static RiskCase NewCase() => new()
    {
        Id = "case-1",
        TransactionId = "transaction-1",
        CustomerId = "customer-1",
        SlaStartedAt = Now,
        CreatedAt = Now,
        UpdatedAt = Now,
    };
}
