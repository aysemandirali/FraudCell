import { api } from '@/shared/api/client';
import type {
  RequestOtpChallengeBody,
  RequestOtpChallengeResponse,
  StaffLoginBody,
  StaffLoginResponse,
  VerifyOtpChallengeBody,
  VerifyOtpChallengeResponse,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export async function requestOtp(
  body: RequestOtpChallengeBody,
): Promise<RequestOtpChallengeResponse> {
  const result = await api.post<RequestOtpChallengeResponse>(endpoints.auth.otpChallenges, {
    body,
    skipAuthRefresh: true,
  });
  return result.data;
}

export async function verifyOtp(
  body: VerifyOtpChallengeBody,
): Promise<VerifyOtpChallengeResponse> {
  const result = await api.post<VerifyOtpChallengeResponse>(endpoints.auth.otpVerifications, {
    body,
    skipAuthRefresh: true,
  });
  return result.data;
}

export async function loginStaff(body: StaffLoginBody): Promise<StaffLoginResponse> {
  const result = await api.post<StaffLoginResponse>(endpoints.auth.staffLogin, {
    body,
    skipAuthRefresh: true,
  });
  return result.data;
}
