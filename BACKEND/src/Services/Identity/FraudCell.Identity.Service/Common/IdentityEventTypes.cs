namespace FraudCell.Identity.Service.Common;

/// <summary>Identity Service'in yayinladigi event tipleri (dokuman §7.5).</summary>
public static class IdentityEventTypes
{
    public const string CustomerRegistered = "identity.customer.registered";
    public const string StaffCreated = "identity.staff.created";
    public const string StaffProfileUpdated = "identity.staff.profile.updated";
    public const string AccountLocked = "identity.account.locked";
    public const string AccountUnlocked = "identity.account.unlocked";
    public const string TokenReuseDetected = "identity.token.reuse.detected";

    /// <summary>Bu servis tuketir: diger servislerin ürettigi audit talebi (dokuman §7.6).</summary>
    public const string AuditEntryRequested = "audit.entry.requested";

    /// <summary>Edge'e giden bildirim talebi (dokuman §16).</summary>
    public const string UserNotificationRequested = "user.notification.requested";
}

/// <summary>Audit <c>action</c> alaninda kullanilan sabit degerler.</summary>
public static class AuditActions
{
    public const string LoginSucceeded = "LOGIN_SUCCEEDED";
    public const string LoginFailed = "LOGIN_FAILED";
    public const string AccountLocked = "ACCOUNT_LOCKED";
    public const string CustomerRegistered = "CUSTOMER_REGISTERED";
    public const string StaffCreated = "STAFF_CREATED";
    public const string RoleChanged = "ROLE_CHANGED";
    public const string TokenReuseDetected = "TOKEN_REUSE_DETECTED";
    public const string Logout = "LOGOUT";
    public const string AuthorizationDenied = "AUTHORIZATION_DENIED";
}
