/**
 * Compile-time checks between the generated OpenAPI schemas and the narrowed
 * application contract. A backend field rename or a new required field makes
 * `npm run typecheck` fail here instead of surfacing later in a screen.
 */

import type { components as AiOpenApi } from './generated/ai';
import type { components as GamificationOpenApi } from './generated/gamification';
import type { components as IdentityOpenApi } from './generated/identity';
import type { components as TransactionOpenApi } from './generated/transaction';
import type {
  AiActiveModelResponse,
  AiCategoryAccuracyResponse,
  AiMetricsOverviewResponse,
  AiPredictionResponse,
  AnalystPerformanceResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  GamificationProfileResponse,
  LeaderboardResponse,
  RequestOtpChallengeBody,
  RequestOtpChallengeResponse,
  StaffLoginBody,
  StaffLoginResponse,
  TransactionDetailResponse,
  VerifyOtpChallengeBody,
  VerifyOtpChallengeResponse,
} from './contract';

type Extends<Actual, Expected> = Actual extends Expected ? true : false;
type Assert<T extends true> = T;

export type ContractCompatibility = [
  Assert<
    Extends<RequestOtpChallengeBody, IdentityOpenApi['schemas']['RequestOtpChallengeRequest']>
  >,
  Assert<
    Extends<RequestOtpChallengeResponse, IdentityOpenApi['schemas']['RequestOtpChallengeResponse']>
  >,
  Assert<Extends<VerifyOtpChallengeBody, IdentityOpenApi['schemas']['VerifyOtpChallengeRequest']>>,
  Assert<
    Extends<VerifyOtpChallengeResponse, IdentityOpenApi['schemas']['VerifyOtpChallengeResponse']>
  >,
  Assert<Extends<StaffLoginBody, IdentityOpenApi['schemas']['StaffLoginRequest']>>,
  Assert<Extends<StaffLoginResponse, IdentityOpenApi['schemas']['StaffLoginResponse']>>,
  Assert<
    Extends<CreateTransactionBody, TransactionOpenApi['schemas']['CreateTransactionRequest']>
  >,
  Assert<
    Extends<CreateTransactionResponse, TransactionOpenApi['schemas']['CreateTransactionResponse']>
  >,
  Assert<
    Extends<TransactionDetailResponse, TransactionOpenApi['schemas']['TransactionDetailResponse']>
  >,
  Assert<
    Extends<GamificationProfileResponse, GamificationOpenApi['schemas']['ProfileResponse']>
  >,
  Assert<
    Extends<AnalystPerformanceResponse, GamificationOpenApi['schemas']['PerformanceResponse']>
  >,
  Assert<Extends<LeaderboardResponse, GamificationOpenApi['schemas']['LeaderboardResponse']>>,
  Assert<Extends<AiActiveModelResponse, AiOpenApi['schemas']['ActiveModelResponse']>>,
  Assert<Extends<AiMetricsOverviewResponse, AiOpenApi['schemas']['MetricsOverviewResponse']>>,
  Assert<
    Extends<AiCategoryAccuracyResponse, AiOpenApi['schemas']['CategoryAccuracyResponse']>
  >,
  Assert<Extends<AiPredictionResponse, AiOpenApi['schemas']['PredictionResponse']>>,
];
