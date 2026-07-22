import { api } from './client';
import type {
  AiAssessment,
  AnalystScore,
  AppNotification,
  AuditEntry,
  Badge,
  CaseStatus,
  CurrentUser,
  FraudType,
  LeaderboardEntry,
  Paged,
  PointEntry,
  RiskCase,
  Transaction,
  TransactionType,
} from '@/domain/types';

/**
 * Backend sözleşmesinin tek temsili. Doküman §10 ve §19'daki niyet belirten
 * operasyon isimleri birebir korunmuştur — generic status update yoktur.
 */

/* ---------------------------------------------------------------- Auth -- */

export interface LoginResult {
  accessToken: string;
  user: CurrentUser;
}

export const authApi = {
  /** Müşteri: GSM'e OTP gönderir. */
  requestOtp: (msisdn: string) => api.post<{ challengeId: string; expiresInSeconds: number }>(
    '/auth/otp/request',
    { msisdn },
  ),

  verifyOtp: (challengeId: string, code: string) =>
    api.post<LoginResult>('/auth/otp/verify', { challengeId, code }),

  /** Personel: e-posta + şifre. 5 başarısız denemede hesap kilitlenir (doküman §20). */
  loginStaff: (email: string, password: string) =>
    api.post<LoginResult>('/auth/login', { email, password }),

  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),

  logout: () => api.post<void>('/auth/logout'),

  me: () => api.get<CurrentUser>('/auth/me'),
};

/* --------------------------------------------------------- İşlemler -- */

export interface CreateTransactionInput {
  amount: number;
  transactionType: TransactionType;
  recipient: string;
  city: string;
  country: string;
  sourceDevice: string;
}

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export const transactionApi = {
  /**
   * 201 Created döner. Değerlendirme asenkron yapıldığı için yanıt
   * assessmentStatus=PENDING ile gelir (doküman §2).
   */
  create: (input: CreateTransactionInput) => api.post<Transaction>('/transactions', input),

  list: (filters: TransactionFilters = {}) =>
    api.get<Paged<Transaction>>('/transactions', { query: { ...filters } }),

  getById: (id: string) => api.get<Transaction>(`/transactions/${id}`),

  /** AI açıklama katmanı: reason code'lar ve model sürümü (doküman §12). */
  assessment: (id: string) => api.get<AiAssessment>(`/transactions/${id}/assessment`),
};

/* ------------------------------------------------------- Risk vakaları -- */

export interface CaseFilters {
  page?: number;
  pageSize?: number;
  status?: CaseStatus | 'ALL';
  /** "me" -> yalnızca bana atanmış vakalar. */
  assignee?: string;
  fraudType?: FraudType;
  search?: string;
  sort?: 'sla' | 'risk' | 'createdAt';
}

export const caseApi = {
  list: (filters: CaseFilters = {}) =>
    api.get<Paged<RiskCase>>('/cases', { query: { ...filters } }),

  getById: (id: string) => api.get<RiskCase>(`/cases/${id}`),

  /** ATANDI -> INCELENIYOR */
  startReview: (id: string, version: number) =>
    api.post<RiskCase>(`/cases/${id}/review`, { version }),

  /** INCELENIYOR -> MUSTERI_DOGRULAMA */
  requestVerification: (id: string, question: string, version: number) =>
    api.post<RiskCase>(`/cases/${id}/verification-requests`, { question, version }),

  /** Müşteri cevabı. NOT_MINE -> risk skoru en az 0.91'e çekilir (doküman §11). */
  respondVerification: (id: string, response: 'MINE' | 'NOT_MINE') =>
    api.post<RiskCase>(`/cases/${id}/verification-response`, { response }),

  /** INCELENIYOR -> ONAYLANDI | BLOKLANDI */
  decide: (id: string, decision: 'ONAYLANDI' | 'BLOKLANDI', note: string, version: number) =>
    api.patch<RiskCase>(`/cases/${id}/decision`, { decision, note, version }),

  /** Süpervizör manuel ataması. */
  assign: (id: string, analystId: string, version: number) =>
    api.put<RiskCase>(`/cases/${id}/assignment`, { analystId, version }),

  /** Süpervizör AI'ın fraud tipini değiştirir; AI bunu feedback olarak alır. */
  overrideFraudType: (id: string, fraudType: FraudType, reason: string, version: number) =>
    api.patch<RiskCase>(`/cases/${id}/fraud-type`, { fraudType, reason, version }),

  addNote: (id: string, body: string) => api.post<RiskCase>(`/cases/${id}/notes`, { body }),

  submitFeedback: (id: string, rating: number, comment: string) =>
    api.post<void>(`/cases/${id}/feedback`, { rating, comment }),

  /** Atama önerisi için uygun analist adayları (doküman §13). */
  assignmentCandidates: (id: string) =>
    api.get<
      {
        analystId: string;
        analystName: string;
        assignmentScore: number;
        expertiseMatch: number;
        capacityRatio: number;
        performance: number;
        activeCases: number;
      }[]
    >(`/cases/${id}/assignment-candidates`),
};

/* -------------------------------------------------------- Gamification -- */

export const gamificationApi = {
  myScore: () => api.get<AnalystScore>('/gamification/me'),

  pointHistory: (page = 1) =>
    api.get<Paged<PointEntry>>('/gamification/me/points', { query: { page } }),

  badges: () => api.get<Badge[]>('/gamification/me/badges'),

  leaderboard: (period: 'daily' | 'weekly') =>
    api.get<LeaderboardEntry[]>('/gamification/leaderboard', { query: { period } }),
};

/* ---------------------------------------------------------- Bildirimler -- */

export const notificationApi = {
  list: () => api.get<AppNotification[]>('/notifications'),
  markRead: (id: string) => api.post<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};

/* ---------------------------------------------------------------- Admin -- */

export const adminApi = {
  auditLog: (page = 1, filters: { action?: string; actorId?: string } = {}) =>
    api.get<Paged<AuditEntry>>('/audit', { query: { page, ...filters } }),

  analysts: () =>
    api.get<
      {
        id: string;
        fullName: string;
        email: string;
        specialties: FraudType[];
        regions: string[];
        activeCases: number;
        accuracy: number;
        locked: boolean;
      }[]
    >('/admin/analysts'),

  createStaff: (input: {
    fullName: string;
    email: string;
    role: 'ANALYST' | 'SUPERVISOR';
    specialties: FraudType[];
    regions: string[];
  }) => api.post<{ id: string; temporaryPassword: string }>('/admin/staff', input),
};

/* ------------------------------------------------------- AI metrikleri -- */

export interface FraudTypeAccuracy {
  fraudType: FraudType;
  accuracy: number;
  sampleSize: number;
}

/**
 * Süpervizör panosundaki AI metrikleri (AIM-002..005, DSH-006/007).
 *
 * Bunlar vaka listesinden türetilemez: ground truth, analistin override'ı ve
 * nihai kararıyla karşılaştırma gerektirir. Bu yüzden sahibi AI Service'tir.
 */
export interface AiMetrics {
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

export const aiApi = {
  metrics: () => api.get<AiMetrics>('/ai/metrics'),
};

/* ----------------------------------------------------- Sistem sağlığı -- */

export interface ServiceHealth {
  name: string;
  displayName: string;
  status: 'UP' | 'DOWN' | 'DEGRADED';
  detail: string;
}

export const systemApi = {
  /** Servis kapatma demosunda arayüzün degraded uyarısı göstermesi için. */
  health: () => api.get<ServiceHealth[]>('/system/health'),

  /**
   * Demo kontrol panelinden servis durdurup başlatma.
   * Yalnızca demo profilinde açıktır; üretim yapılandırmasında bu uç bulunmaz.
   */
  setStatus: (name: string, status: 'UP' | 'DOWN') =>
    api.post<ServiceHealth[]>(`/system/health/${name}`, { status }),
};
