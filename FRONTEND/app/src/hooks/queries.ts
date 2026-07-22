import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  caseApi,
  gamificationApi,
  notificationApi,
  systemApi,
  transactionApi,
  type CaseFilters,
  type CreateTransactionInput,
  type TransactionFilters,
} from '@/api/endpoints';
import { queryKeys } from './queryKeys';
import type { FraudType } from '@/domain/types';

/* ------------------------------------------------------------- İşlemler -- */

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.transactionList(filters),
    queryFn: () => transactionApi.list(filters),
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ''),
    queryFn: () => transactionApi.getById(id!),
    enabled: Boolean(id),
    // Değerlendirme beklerken sonucu yakalamak için kısa aralıkla yokla.
    // SSE zaten tetikliyor; bu yalnızca emniyet ağı.
    refetchInterval: (query) =>
      query.state.data?.assessmentStatus === 'PENDING' ? 2000 : false,
  });
}

/** AI açıklama katmanı. Değerlendirme tamamlanmadan çağrılmaz. */
export function useAssessment(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.transaction(id ?? ''), 'assessment'],
    queryFn: () => transactionApi.assessment(id!),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => transactionApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

/* ----------------------------------------------------------- Risk vakaları -- */

export function useCases(filters: CaseFilters = {}) {
  return useQuery({
    queryKey: queryKeys.caseList(filters),
    queryFn: () => caseApi.list(filters),
  });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.case(id ?? ''),
    queryFn: () => caseApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useAssignmentCandidates(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.caseCandidates(id ?? ''),
    queryFn: () => caseApi.assignmentCandidates(id!),
    enabled: Boolean(id) && enabled,
  });
}

/**
 * Vaka üzerinde durum değiştiren tüm aksiyonlar. Başarıda hem detay hem liste
 * tazelenir; 409 çakışmasında çağıran taraf kullanıcıyı uyarır.
 */
export function useCaseActions(caseId: string | undefined) {
  const queryClient = useQueryClient();

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cases });
    void queryClient.invalidateQueries({ queryKey: queryKeys.gamification });
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  }

  const startReview = useMutation({
    mutationFn: (version: number) => caseApi.startReview(caseId!, version),
    onSuccess: refresh,
  });

  const requestVerification = useMutation({
    mutationFn: (input: { question: string; version: number }) =>
      caseApi.requestVerification(caseId!, input.question, input.version),
    onSuccess: refresh,
  });

  const respondVerification = useMutation({
    mutationFn: (response: 'MINE' | 'NOT_MINE') => caseApi.respondVerification(caseId!, response),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });

  const decide = useMutation({
    mutationFn: (input: {
      decision: 'ONAYLANDI' | 'BLOKLANDI';
      note: string;
      version: number;
    }) => caseApi.decide(caseId!, input.decision, input.note, input.version),
    onSuccess: refresh,
  });

  const assign = useMutation({
    mutationFn: (input: { analystId: string; version: number }) =>
      caseApi.assign(caseId!, input.analystId, input.version),
    onSuccess: refresh,
  });

  const overrideFraudType = useMutation({
    mutationFn: (input: { fraudType: FraudType; reason: string; version: number }) =>
      caseApi.overrideFraudType(caseId!, input.fraudType, input.reason, input.version),
    onSuccess: refresh,
  });

  const addNote = useMutation({
    mutationFn: (body: string) => caseApi.addNote(caseId!, body),
    onSuccess: refresh,
  });

  const submitFeedback = useMutation({
    mutationFn: (input: { rating: number; comment: string }) =>
      caseApi.submitFeedback(caseId!, input.rating, input.comment),
  });

  return {
    startReview,
    requestVerification,
    respondVerification,
    decide,
    assign,
    overrideFraudType,
    addNote,
    submitFeedback,
  };
}

/* -------------------------------------------------------- Gamification -- */

export function useMyScore() {
  return useQuery({ queryKey: queryKeys.myScore, queryFn: () => gamificationApi.myScore() });
}

export function usePointHistory() {
  return useQuery({ queryKey: queryKeys.points, queryFn: () => gamificationApi.pointHistory() });
}

export function useBadges() {
  return useQuery({ queryKey: queryKeys.badges, queryFn: () => gamificationApi.badges() });
}

export function useLeaderboard(period: 'daily' | 'weekly') {
  return useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: () => gamificationApi.leaderboard(period),
  });
}

/* --------------------------------------------------------- Bildirimler -- */

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationApi.list(),
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

/* --------------------------------------------------------------- Admin -- */

export function useAuditLog(pageNumber = 1) {
  return useQuery({
    queryKey: queryKeys.audit(pageNumber),
    queryFn: () => adminApi.auditLog(pageNumber),
  });
}

export function useAnalysts() {
  return useQuery({ queryKey: queryKeys.analysts, queryFn: () => adminApi.analysts() });
}

/* ------------------------------------------------------- Sistem sağlığı -- */

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => systemApi.health(),
    // Servis kapatma demosunda banner'ın hızlı tepki vermesi için.
    refetchInterval: 10_000,
  });
}
