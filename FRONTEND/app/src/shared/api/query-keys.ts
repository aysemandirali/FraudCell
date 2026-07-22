/**
 * Query key kaydı.
 *
 * Merkezi tutulmasının sebebi realtime katmanıdır: SSE handler'ı bir vaka
 * güncellendiğinde `cases` ve `case-detail` cache'lerini invalidate etmek
 * zorunda ve bunu feature'ların iç anahtarlarını bilmeden yapamaz. Anahtarlar
 * feature'lara dağılsaydı, invalidate eden taraf ile query tanımlayan taraf
 * ayrı ayrı string yazar ve sessizce kaçırırdı.
 *
 * Hiyerarşi kasıtlı: `['cases']` ile invalidate etmek altındaki tüm liste
 * varyantlarını (filtre/cursor kombinasyonları) kapsar.
 */

import type { CaseStatus, RiskLevel } from './enums';

export const queryKeys = {
  /* ------------------------------------------------------------- kimlik -- */
  session: ['session'] as const,
  currentUser: ['session', 'me'] as const,
  sessions: ['session', 'devices'] as const,

  /* ------------------------------------------------------------ işlemler -- */
  transactions: {
    all: ['transactions'] as const,
    list: (filters: Record<string, unknown> = {}) => ['transactions', 'list', filters] as const,
    detail: (transactionId: string) => ['transactions', 'detail', transactionId] as const,
  },

  /* --------------------------------------------------------------- vaka -- */
  cases: {
    all: ['cases'] as const,
    /** Süpervizör/admin — tüm vakalar. */
    list: (filters: { status?: CaseStatus; riskLevel?: RiskLevel; cursor?: string } = {}) =>
      ['cases', 'list', filters] as const,
    /** Analist — kendine atanmışlar. */
    assigned: (filters: { status?: CaseStatus } = {}) => ['cases', 'assigned', filters] as const,
    assignmentQueue: (queueType: string) => ['cases', 'queue', queueType] as const,

    detail: (caseId: string) => ['cases', 'detail', caseId] as const,
    history: (caseId: string) => ['cases', 'detail', caseId, 'history'] as const,
    notes: (caseId: string) => ['cases', 'detail', caseId, 'notes'] as const,
  },

  /* ------------------------------------------------------------ müşteri -- */
  pendingVerifications: ['customer', 'verifications', 'pending'] as const,

  /* -------------------------------------------------------------- staff -- */
  staff: {
    all: ['staff'] as const,
    list: ['staff', 'list'] as const,
    detail: (staffId: string) => ['staff', 'detail', staffId] as const,
  },

  reference: {
    roles: ['reference', 'roles'] as const,
    specialties: ['reference', 'specialties'] as const,
    regions: ['reference', 'regions'] as const,
  },

  auditLogs: (filters: Record<string, unknown> = {}) => ['audit-logs', filters] as const,

  /* -------------------------------------------------------- oyunlaştırma -- */
  gamification: {
    all: ['gamification'] as const,
    me: ['gamification', 'me'] as const,
    profile: (analystId: string) => ['gamification', 'profile', analystId] as const,
    points: (analystId: string) => ['gamification', 'profile', analystId, 'points'] as const,
    badges: (analystId: string) => ['gamification', 'profile', analystId, 'badges'] as const,
    performance: (analystId: string) =>
      ['gamification', 'performance', analystId] as const,
    leaderboard: (period: string) => ['gamification', 'leaderboard', period] as const,
  },

  ai: {
    metrics: ['ai', 'metrics'] as const,
    categoryAccuracy: ['ai', 'metrics', 'categories'] as const,
    decisionAgreement: ['ai', 'metrics', 'decision-agreement'] as const,
    activeModel: ['ai', 'models', 'active'] as const,
    prediction: (assessmentId: string) => ['ai', 'predictions', assessmentId] as const,
    explanationByTransaction: (transactionId: string) =>
      ['ai', 'predictions', 'by-transaction', transactionId, 'explanation'] as const,
  },

  /* Canlı SSE bildirimleri kullanıcı oturumu boyunca query cache'te tutulur. */
  notifications: ['notifications'] as const,

  /* Aggregate endpoint'i olmayan, ekranların alt sorgulardan oluşturduğu görünümler. */
  dashboard: ['dashboard'] as const,
  systemHealth: ['system', 'health'] as const,
} as const;
