/**
 * FraudCell domain tipleri.
 * Kaynak: BACKEND/docs/00-START-HERE.md — §8, §9, §10, §13, §17, §19.
 * Backend sözleşmesi değişirse tek değiştirilecek yer burasıdır.
 */

/* ---------------------------------------------------------------- Kimlik -- */

export type Role = 'MUSTERI' | 'ANALYST' | 'SUPERVISOR' | 'ADMIN';

export const ROLE_LABEL: Record<Role, string> = {
  MUSTERI: 'Müşteri',
  ANALYST: 'Analist',
  SUPERVISOR: 'Süpervizör',
  ADMIN: 'Yönetici',
};

export type Region =
  | 'MARMARA'
  | 'EGE'
  | 'AKDENIZ'
  | 'IC_ANADOLU'
  | 'KARADENIZ'
  | 'DOGU_ANADOLU'
  | 'GUNEYDOGU_ANADOLU';

export const REGION_LABEL: Record<Region, string> = {
  MARMARA: 'Marmara',
  EGE: 'Ege',
  AKDENIZ: 'Akdeniz',
  IC_ANADOLU: 'İç Anadolu',
  KARADENIZ: 'Karadeniz',
  DOGU_ANADOLU: 'Doğu Anadolu',
  GUNEYDOGU_ANADOLU: 'Güneydoğu Anadolu',
};

export interface CurrentUser {
  id: string;
  fullName: string;
  role: Role;
  /** Müşteri hesaplarında dolu. */
  msisdn?: string;
  /** Personel hesaplarında dolu. */
  email?: string;
  /** Analistin uzmanlık alanları — atama skorunu belirler. */
  specialties: FraudType[];
  regions: Region[];
}

/* ------------------------------------------------------------- İşlemler -- */

export type TransactionType =
  | 'PARA_GONDERME'
  | 'PARA_YUKLEME'
  | 'YURT_DISI_TRANSFER'
  | 'FATURA_ODEME'
  | 'ALISVERIS';

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  PARA_GONDERME: 'Para Gönderme',
  PARA_YUKLEME: 'Para Yükleme',
  YURT_DISI_TRANSFER: 'Yurt Dışı Transfer',
  FATURA_ODEME: 'Fatura Ödeme',
  ALISVERIS: 'Alışveriş',
};

/**
 * Değerlendirme durumu. AI servisi kapalıyken PENDING'de kalır — işlem yine de
 * oluşur ve kaybolmaz (doküman §21).
 */
export type AssessmentStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

/** Risk seviyesi yalnızca değerlendirme tamamlandığında dolar. */
export type RiskLevel = 'DUSUK' | 'ORTA' | 'YUKSEK' | 'KRITIK';

/** Karar eşikleri: <0.40 ONAY, 0.40–0.90 INCELEME, >0.90 BLOK (doküman §9). */
export type Decision = 'ONAY' | 'INCELEME' | 'BLOK';

export type FraudType =
  | 'CALINTI_KART'
  | 'HESAP_ELE_GECIRME'
  | 'PARA_AKLAMA'
  | 'SUPHELI_DAVRANIS'
  | 'TEMIZ';

export const FRAUD_TYPE_LABEL: Record<FraudType, string> = {
  CALINTI_KART: 'Çalıntı Kart',
  HESAP_ELE_GECIRME: 'Hesap Ele Geçirme',
  PARA_AKLAMA: 'Para Aklama',
  SUPHELI_DAVRANIS: 'Şüpheli Davranış',
  TEMIZ: 'Temiz',
};

export interface Transaction {
  /** ULID — sıralanabilir iç kimlik. */
  id: string;
  /** "TRX-2026-000123" — kullanıcıya gösterilen numara. */
  transactionNo: string;
  amount: number;
  transactionType: TransactionType;
  recipient: string;
  sourceDevice: string;
  city: string;
  country: string;
  occurredAt: string;

  assessmentStatus: AssessmentStatus;
  /** Değerlendirme tamamlanmadan null. */
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  decision: Decision | null;
  fraudType: FraudType | null;

  /** Müşteri "ben yapmadım" dediğinde ya da BLOK kararında true olur. */
  temporaryBlock: boolean;
  /** Bu işlemden bir risk vakası doğduysa dolu. */
  caseId: string | null;
}

/* ------------------------------------------------ AI değerlendirme çıktısı -- */

export type ReasonImpact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ReasonCode {
  code: string;
  label: string;
  impact: ReasonImpact;
}

export interface AiAssessment {
  transactionId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  decision: Decision;
  fraudType: FraudType;
  modelVersion: string;
  /**
   * Operasyonel açıklamalar. Model açıklaması DEĞİLDİR; engineered feature ve
   * rule evaluation katmanından üretilir (doküman §12).
   */
  reasonCodes: ReasonCode[];
  assessedAt: string;
}

/* ----------------------------------------------------------- Risk vakası -- */

export type CaseStatus =
  | 'YENI'
  | 'ATANDI'
  | 'INCELENIYOR'
  | 'MUSTERI_DOGRULAMA'
  | 'ONAYLANDI'
  | 'BLOKLANDI'
  | 'KAPANDI';

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  YENI: 'Yeni',
  ATANDI: 'Atandı',
  INCELENIYOR: 'İnceleniyor',
  MUSTERI_DOGRULAMA: 'Müşteri Doğrulama',
  ONAYLANDI: 'Onaylandı',
  BLOKLANDI: 'Bloklandı',
  KAPANDI: 'Kapandı',
};

/** Uygun analist yoksa vaka YENI kalır ve atama kuyruğa alınır (doküman §9). */
export type AssignmentStatus = 'QUEUED' | 'ASSIGNED';

export type CustomerResponse = 'MINE' | 'NOT_MINE';

export interface CaseNote {
  id: string;
  authorId: string;
  authorName: string;
  /** Düz metin. HTML kabul edilmez (doküman §20 — XSS). */
  body: string;
  createdAt: string;
}

export interface CaseTransition {
  id: string;
  fromStatus: CaseStatus | null;
  toStatus: CaseStatus;
  actorId: string;
  actorName: string;
  occurredAt: string;
  reason?: string;
}

export interface VerificationRequest {
  id: string;
  question: string;
  requestedAt: string;
  respondedAt: string | null;
  response: CustomerResponse | null;
}

export interface RiskCase {
  id: string;
  caseNo: string;
  transactionId: string;
  transaction: Transaction;

  status: CaseStatus;
  assignmentStatus: AssignmentStatus;
  assignedAnalystId: string | null;
  assignedAnalystName: string | null;

  riskScore: number | null;
  riskLevel: RiskLevel | null;
  fraudType: FraudType | null;
  /** Süpervizör AI'ın fraud tipini değiştirdiyse orijinali burada saklanır. */
  fraudTypeOverriddenFrom: FraudType | null;

  /** KRITIK vakalarda 15 dakika (doküman §9). Yoksa SLA takibi yapılmaz. */
  slaDueAt: string | null;
  slaBreached: boolean;

  createdAt: string;
  closedAt: string | null;

  notes: CaseNote[];
  transitions: CaseTransition[];
  verificationRequests: VerificationRequest[];

  /** Optimistic concurrency — 409 çakışmasını önler (doküman §10). */
  version: number;
}

/** Müşteri vaka kapandıktan sonra geri bildirim verebilir. */
export interface CaseFeedback {
  caseId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  submittedAt: string;
}

/* --------------------------------------------------------- Gamification -- */

export type PointRuleCode =
  | 'CASE_DECISION'
  | 'FAST_DECISION'
  | 'CONFIRMED_FRAUD'
  | 'CRITICAL_WITHIN_SLA'
  | 'SLA_BREACH'
  | 'CUSTOMER_FEEDBACK';

export const POINT_RULE_LABEL: Record<PointRuleCode, string> = {
  CASE_DECISION: 'Vaka kararı verildi',
  FAST_DECISION: 'Hızlı karar',
  CONFIRMED_FRAUD: 'Doğrulanmış dolandırıcılık',
  CRITICAL_WITHIN_SLA: 'Kritik vaka SLA içinde',
  SLA_BREACH: 'SLA aşımı',
  CUSTOMER_FEEDBACK: 'Müşteri geri bildirimi',
};

export interface PointEntry {
  id: string;
  caseId: string | null;
  caseNo: string | null;
  ruleCode: PointRuleCode;
  points: number;
  occurredAt: string;
}

export interface Badge {
  code: string;
  name: string;
  description: string;
  /** Rozet henüz kazanılmadıysa null. */
  earnedAt: string | null;
  /** 0–1 arası ilerleme; kazanılmış rozetlerde 1. */
  progress: number;
  progressLabel: string;
}

export interface LeaderboardEntry {
  rank: number;
  analystId: string;
  analystName: string;
  points: number;
  resolvedCases: number;
  accuracy: number;
  /** Oturumdaki kullanıcının satırını vurgulamak için. */
  isCurrentUser: boolean;
}

export interface AnalystScore {
  analystId: string;
  totalPoints: number;
  dailyPoints: number;
  weeklyPoints: number;
  resolvedCases: number;
  activeCases: number;
  /** Kapasite oranı 10 aktif vaka üzerinden hesaplanır (doküman §13). */
  capacity: number;
  accuracy: number;
  dailyRank: number;
  weeklyRank: number;
}

/* ---------------------------------------------------------------- Audit -- */

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  sourceService: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  result: 'SUCCESS' | 'FAILURE';
  occurredAt: string;
  correlationId: string;
  details: Record<string, unknown>;
}

/* -------------------------------------------------------- Bildirim (SSE) -- */

export type NotificationKind =
  | 'AI_ASSESSMENT_COMPLETED'
  | 'CASE_ASSIGNED'
  | 'VERIFICATION_REQUESTED'
  | 'POINTS_EARNED'
  | 'BADGE_EARNED'
  | 'SLA_CRITICAL'
  | 'CASE_CLOSED';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Tıklanınca gidilecek uygulama içi yol. */
  link: string | null;
  createdAt: string;
  read: boolean;
}

/* ------------------------------------------------------- API zarf tipleri -- */

export interface ApiMeta {
  traceId: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  meta: ApiMeta;
}

export interface ApiFailure {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: ApiMeta;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
