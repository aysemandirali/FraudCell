namespace FraudCell.BuildingBlocks.Api;

/// <summary>
/// Sistem genelinde kullanilan hata kodlari. Frontend bu kodlara gore davranis
/// degistirdigi icin (ornegin ACCOUNT_LOCKED ekrani) string'ler sabittir.
/// </summary>
public static class ErrorCodes
{
    // --- Genel ---
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string NotFound = "NOT_FOUND";
    public const string Forbidden = "FORBIDDEN";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Conflict = "CONFLICT";
    public const string RateLimited = "RATE_LIMITED";
    public const string InternalError = "INTERNAL_ERROR";
    public const string DependencyUnavailable = "DEPENDENCY_UNAVAILABLE";
    public const string PayloadTooLarge = "PAYLOAD_TOO_LARGE";

    // --- Identity ---
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string AccountLocked = "ACCOUNT_LOCKED";
    public const string PasswordPolicyViolation = "PASSWORD_POLICY_VIOLATION";
    public const string OtpInvalid = "OTP_INVALID";
    public const string OtpExpired = "OTP_EXPIRED";
    public const string OtpAttemptsExceeded = "OTP_ATTEMPTS_EXCEEDED";
    public const string RefreshTokenInvalid = "REFRESH_TOKEN_INVALID";
    public const string RefreshTokenReuseDetected = "REFRESH_TOKEN_REUSE_DETECTED";
    public const string MsisdnAlreadyRegistered = "MSISDN_ALREADY_REGISTERED";
    public const string EmailAlreadyRegistered = "EMAIL_ALREADY_REGISTERED";

    // --- Transaction / Case ---
    public const string InvalidCaseTransition = "INVALID_CASE_TRANSITION";
    public const string ConcurrencyConflict = "CONCURRENCY_CONFLICT";
    public const string IdempotencyConflict = "IDEMPOTENCY_CONFLICT";
    public const string CaseNotAssignedToUser = "CASE_NOT_ASSIGNED_TO_USER";
    public const string DecisionNoteRequired = "DECISION_NOTE_REQUIRED";
    public const string AnalystCapacityExceeded = "ANALYST_CAPACITY_EXCEEDED";
    public const string VerificationNotPending = "VERIFICATION_NOT_PENDING";
    public const string FeedbackNotAllowed = "FEEDBACK_NOT_ALLOWED";
    public const string FeedbackAlreadySubmitted = "FEEDBACK_ALREADY_SUBMITTED";
    public const string AssessmentAlreadyApplied = "ASSESSMENT_ALREADY_APPLIED";
}
