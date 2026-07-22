import { fetchData } from '@/shared/api/client';
import type {
  AnalystPerformanceResponse,
  GamificationProfileResponse,
  LeaderboardPeriod,
  LeaderboardResponse,
  PointLedgerItemResponse,
} from '@/shared/api/contract';
import { endpoints } from '@/shared/api/endpoints';

export function getMyGamificationProfile(): Promise<GamificationProfileResponse> {
  return fetchData(endpoints.gamification.myProfile);
}

export function getAnalystPoints(analystId: string): Promise<PointLedgerItemResponse[]> {
  return fetchData(endpoints.gamification.points(analystId), { query: { limit: 50 } });
}

export function getAnalystPerformance(analystId: string): Promise<AnalystPerformanceResponse> {
  return fetchData(endpoints.gamification.performance(analystId));
}

export function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardResponse> {
  return fetchData(endpoints.gamification.leaderboard, { query: { period, limit: 10 } });
}
