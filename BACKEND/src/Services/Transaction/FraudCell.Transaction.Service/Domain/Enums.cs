namespace FraudCell.Transaction.Service.Domain;

/// <summary>Dokuman `05-DOMAIN-AND-STATE-MACHINE.md` §7.</summary>
public enum TransactionType
{
    ODEME,
    TRANSFER,
    FATURA,
    CEKIM,
}

/// <summary>Dokuman §8. <c>TEMIZ</c> AI'in "supheli degil" sinifidir; analist uzmanligi degildir.</summary>
public enum FraudType
{
    CALINTI_KART,
    HESAP_ELE_GECIRME,
    PARA_AKLAMA,
    SUPHELI_DAVRANIS,
    TEMIZ,
}

/// <summary>Dokuman §11. <c>DUSUK/ORTA/YUKSEK/KRITIK</c> eslesmesi §11'de sabittir.</summary>
public enum RiskLevel
{
    DUSUK,
    ORTA,
    YUKSEK,
    KRITIK,
}

/// <summary>Dokuman §10 esik kararlari: <c>ONAY/INCELEME/BLOK</c>.</summary>
public enum ScreeningDecision
{
    ONAY,
    INCELEME,
    BLOK,
}

/// <summary>Dokuman §9. AI degerlendirme durumu.</summary>
public enum AssessmentStatus
{
    PENDING,
    COMPLETED,
    TIMED_OUT,
    FAILED,
}

/// <summary>Dokuman §14. Transaction'in finansal/operasyonel kontrol durumu.</summary>
public enum ControlStatus
{
    ALLOWED,
    TEMPORARILY_BLOCKED,
    APPROVED,
    BLOCKED,
}

/// <summary>Dokuman §16. RiskCase state machine.</summary>
public enum CaseStatus
{
    YENI,
    ATANDI,
    INCELENIYOR,
    MUSTERI_DOGRULAMA,
    ONAYLANDI,
    BLOKLANDI,
    KAPANDI,
}

/// <summary>Dokuman §32. Case state'inden BAGIMSIZ assignment durumu.</summary>
public enum AssignmentStatus
{
    UNASSIGNED,
    QUEUED,
    MANUAL_QUEUE,
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
}

/// <summary>Dokuman `06-DATA-ARCHITECTURE.md` §24 assignment kaydinin kendi durumu.</summary>
public enum CaseAssignmentStatus
{
    ASSIGNED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
}

public enum AssignmentSource
{
    AI_RECOMMENDATION,
    SYSTEM,
    SUPERVISOR,
    MANUAL_QUEUE,
}

/// <summary>Dokuman §35. SLA sureleri risk seviyesine gore belirlenir.</summary>
public enum SlaPriority
{
    DUSUK,
    ORTA,
    YUKSEK,
    KRITIK,
}

public enum FinalDecision
{
    APPROVE,
    BLOCK,
}

/// <summary>Dokuman §15/§31. Gecici blok nedenleri.</summary>
public enum TemporaryBlockReason
{
    AI_CRITICAL_RISK,
    CUSTOMER_NOT_MINE,
    CRITICAL_SLA_BREACH,
    SUPERVISOR_SECURITY_OVERRIDE,
}

public enum VerificationStatus
{
    PENDING,
    ANSWERED,
    EXPIRED,
    CANCELLED,
}

public enum VerificationResponse
{
    MINE,
    NOT_MINE,
    NO_RESPONSE,
}

public enum OverrideType
{
    FRAUD_TYPE,
    RISK_LEVEL,
}

public enum TransitionSource
{
    SYSTEM,
    ANALYST,
    SUPERVISOR,
    CUSTOMER,
}

public enum IdempotencyStatus
{
    PROCESSING,
    COMPLETED,
    FAILED,
}
