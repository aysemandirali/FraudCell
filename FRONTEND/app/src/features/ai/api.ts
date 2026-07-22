import { api } from '@/shared/api/client';
import type {
  AiCategoryAccuracyResponse,
  AiDecisionAgreementResponse,
  AiExplanationResponse,
  AiMetricsOverviewResponse,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export async function getAiMetricsOverview(): Promise<AiMetricsOverviewResponse> {
  return (await api.get<AiMetricsOverviewResponse>(endpoints.ai.metrics.overview)).data;
}

/** Fraud tipine göre model doğruluğu — pano kategori grafiğini besler. */
export async function getAiCategoryAccuracy(): Promise<AiCategoryAccuracyResponse> {
  return (await api.get<AiCategoryAccuracyResponse>(endpoints.ai.metrics.categories)).data;
}

/** AI kararı ile nihai analist kararının uyum oranı. */
export async function getAiDecisionAgreement(): Promise<AiDecisionAgreementResponse> {
  return (await api.get<AiDecisionAgreementResponse>(endpoints.ai.metrics.decisionAgreement)).data;
}

/** Vaka detay ekranı için: işlem kimliğinden AI açıklama anlatısını çeker (lazy + cache). */
export async function getExplanationByTransaction(
  transactionId: string,
): Promise<AiExplanationResponse> {
  return (
    await api.get<AiExplanationResponse>(endpoints.ai.explanationByTransaction(transactionId))
  ).data;
}

