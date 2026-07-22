/**
 * ⚠️ BACKEND'İ HENÜZ YAZILMAMIŞ servislerin sözleşmesi.
 *
 * Bu dosyadaki hiçbir tipin karşılığı `BACKEND/src` altında YOKTUR. Çözümde
 * yalnızca Identity ve Transaction servisleri var; aşağıdakiler MSW mock'u
 * tarafından karşılanır:
 *
 *   - Gamification (puan, rozet, liderlik tablosu)
 *   - Notification (bildirim listesi + SSE)
 *   - AI metrikleri (süpervizör panosu)
 *   - Dashboard aggregate'leri
 *   - Sistem sağlığı (demo kontrol paneli)
 *
 * Bunlar `contract.ts` ile AYNI DOSYADA TUTULMAZ; böylece gerçek sözleşme ile
 * varsayım birbirine karışmaz. İlgili servis yazıldığında yapılacaklar:
 *   1. Tipi `contract.ts`'e gerçek C# record'una göre taşı,
 *   2. `mocks/handlers/` altındaki karşılığını sil,
 *   3. Bu dosyadan kaldır.
 *
 * Şekiller doküman §13 (gamification) ve §53 (dashboard) baz alınarak
 * tasarlandı; gerçek servis geldiğinde DEĞİŞMESİ BEKLENİR.
 */

import type { CursorPage, PageInfo } from './contract';
import type { CaseStatus, FraudType, RiskLevel } from './enums';

export type { CursorPage, PageInfo };

/* ========================================================================== */
/*  Gamification                                                              */
/* ========================================================================== */

export const POINT_RULE_CODES = [
  'CASE_DECISION',
  'FAST_DECISION',
  'CONFIRMED_FRAUD',
  'CRITICAL_WITHIN_SLA',
  'SLA_BREACH',
  'CUSTOMER_FEEDBACK',
] as const;
export type PointRuleCode = (typeof POINT_RULE_CODES)[number];

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
  transactionNo: string | null;
  ruleCode: PointRuleCode;
  /** SLA_BREACH'te negatif olabilir. */
  points: number;
  occurredAt: string;
}

export interface BadgeResponse {
  code: string;
  name: string;
  description: string;
  /** Henüz kazanılmadıysa null. */
  earnedAt: string | null;
  /** 0–1 arası; kazanılmışlarda 1. */
  progress: number;
  progressLabel: string;
}

export interface AnalystScoreResponse {
  analystId: string;
  totalPoints: number;
  dailyPoints: number;
  weeklyPoints: number;
  resolvedCases: number;
  activeCases: number;
  /** 10 aktif vaka üzerinden kapasite oranı (doküman §13). */
  capacity: number;
  accuracy: number;
  dailyRank: number;
  weeklyRank: number;
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

export type LeaderboardPeriod = 'daily' | 'weekly';

/* ========================================================================== */
/*  Notification                                                              */
/* ========================================================================== */

export const NOTIFICATION_KINDS = [
  'AI_ASSESSMENT_COMPLETED',
  'CASE_ASSIGNED',
  'VERIFICATION_REQUESTED',
  'POINTS_EARNED',
  'BADGE_EARNED',
  'SLA_CRITICAL',
  'CASE_CLOSED',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

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

/* ========================================================================== */
/*  Dashboard aggregate'leri                                                  */
/* ========================================================================== */

/**
 * DESIGN.MD kural 2: dashboard metrikleri frontend'de HESAPLANMAZ. Servis
 * aggregate döndürür, frontend yalnızca görselleştirir. Mock da bu kurala
 * uyar — vaka listesinden türetmez, kendi aggregate'ini üretir.
 */
export interface DashboardSummary {
  openCases: number;
  criticalCases: number;
  slaBreaches: number;
  avgDecisionMinutes: number;
  decidedToday: number;
  blockedToday: number;
}

export interface CaseStatusSlice {
  status: CaseStatus;
  count: number;
}

export interface FraudTypeSlice {
  fraudType: FraudType;
  count: number;
}

export interface RiskLevelSlice {
  riskLevel: RiskLevel;
  count: number;
}

export interface CaseTrendPoint {
  /** ISO tarih (gün başlangıcı). */
  date: string;
  opened: number;
  closed: number;
  slaBreached: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  byStatus: CaseStatusSlice[];
  byFraudType: FraudTypeSlice[];
  byRiskLevel: RiskLevelSlice[];
  trend: CaseTrendPoint[];
  /** `meta.generatedAt` ile aynı; kart altında "son güncelleme" olarak gösterilir. */
  generatedAt: string;
}

/* ========================================================================== */
/*  AI metrikleri                                                             */
/* ========================================================================== */

export interface FraudTypeAccuracy {
  fraudType: FraudType;
  accuracy: number;
  sampleSize: number;
}

/**
 * Vaka listesinden TÜRETİLEMEZ: ground truth ile analistin override'ı ve nihai
 * kararının karşılaştırılmasını gerektirir. Sahibi AI Service'tir.
 */
export interface AiMetricsResponse {
  /** Fraud türü tahmininin override edilmeden kalma oranı. */
  overallAccuracy: number;
  /** AI kararı ile analistin nihai kararının uyuşma oranı. */
  decisionAgreement: number;
  /** AI'ın BLOK dediği ama analistin onayladığı vakaların oranı. */
  falsePositiveRate: number;
  totalPredictions: number;
  modelVersion: string;
  byFraudType: FraudTypeAccuracy[];
}

/* ========================================================================== */
/*  Sistem sağlığı — demo kontrol paneli                                      */
/* ========================================================================== */

export const SERVICE_HEALTH_STATUSES = ['UP', 'DOWN', 'DEGRADED'] as const;
export type ServiceHealthStatus = (typeof SERVICE_HEALTH_STATUSES)[number];

export interface ServiceHealth {
  name: string;
  displayName: string;
  status: ServiceHealthStatus;
  detail: string;
}
