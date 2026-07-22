import { api } from '@/shared/api/client';
import type {
  PendingVerificationResponse,
  SessionResponse,
  SubmitVerificationResponseBody,
  SubmitVerificationResponseResult,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export async function listPendingVerifications(): Promise<PendingVerificationResponse[]> {
  return (await api.get<PendingVerificationResponse[]>(endpoints.customer.pendingVerifications)).data;
}

export async function submitVerification(
  caseId: string,
  body: SubmitVerificationResponseBody,
): Promise<SubmitVerificationResponseResult> {
  return (
    await api.post<SubmitVerificationResponseResult>(endpoints.cases.verificationResponses(caseId), {
      body,
    })
  ).data;
}

export async function listSessions(): Promise<SessionResponse[]> {
  return (await api.get<SessionResponse[]>(endpoints.auth.sessions)).data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete<void>(endpoints.auth.session(sessionId));
}

