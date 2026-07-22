import type { CaseFilters, TransactionFilters } from '@/api/endpoints';

/** Tüm sorgu anahtarları tek yerde — invalidate çağrıları tutarlı kalsın. */
export const queryKeys = {
  me: ['me'] as const,

  transactions: ['transactions'] as const,
  transactionList: (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
  transaction: (id: string) => ['transactions', 'detail', id] as const,

  cases: ['cases'] as const,
  caseList: (filters: CaseFilters) => ['cases', 'list', filters] as const,
  case: (id: string) => ['cases', 'detail', id] as const,
  caseCandidates: (id: string) => ['cases', 'candidates', id] as const,

  gamification: ['gamification'] as const,
  myScore: ['gamification', 'score'] as const,
  points: ['gamification', 'points'] as const,
  badges: ['gamification', 'badges'] as const,
  leaderboard: (period: string) => ['gamification', 'leaderboard', period] as const,

  notifications: ['notifications'] as const,

  audit: (page: number) => ['audit', page] as const,
  analysts: ['analysts'] as const,
  health: ['health'] as const,
  aiMetrics: ['ai', 'metrics'] as const,
};
