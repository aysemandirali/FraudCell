import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Crown, Medal } from 'lucide-react';
import { getLeaderboard } from '@/features/gamification/api';
import type { LeaderboardItemResponse, LeaderboardPeriod } from '@/shared/api/contract';
import { queryKeys } from '@/shared/api/query-keys';
import { formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Avatar, EmptyState, ErrorState, PageHeader, SkeletonList, Tabs } from '@/shared/ui';

/** İlk üç için podyum sırası: 2 · 1 · 3 (ortada birinci, yükseltilmiş). */
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_STYLE = [
  { ring: 'ring-tc-500', badge: 'bg-tc-500 text-brand-900', height: 'sm:mt-0', icon: Crown },
  { ring: 'ring-ink-300', badge: 'bg-ink-300 text-ink-800', height: 'sm:mt-6', icon: Medal },
  { ring: 'ring-warning-500/60', badge: 'bg-warning-500 text-white', height: 'sm:mt-10', icon: Medal },
];

function Podium({ items }: { items: LeaderboardItemResponse[] }) {
  const top = items.slice(0, 3);
  return (
    <div className="mb-6 grid grid-cols-3 items-end gap-3">
      {PODIUM_ORDER.map((rankIndex) => {
        const item = top[rankIndex];
        if (!item) return <div key={rankIndex} />;
        const style = PODIUM_STYLE[rankIndex]!;
        const Icon = style.icon;
        return (
          <div
            key={item.analystId}
            className={cn(
              'surface-panel flex flex-col items-center p-4 text-center',
              style.height,
            )}
          >
            <div className="relative">
              <Avatar name={item.displayName ?? item.analystId} size="lg" className={cn('ring-2', style.ring)} />
              <span
                className={cn(
                  'absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full text-micro font-bold',
                  style.badge,
                )}
              >
                {item.rank}
              </span>
            </div>
            <Icon className="mt-2 size-4 text-tc-500" aria-hidden />
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-ink-900">
              {item.displayName ?? 'Analist'}
            </p>
            <p className="text-lg font-bold tabular text-brand-800">{formatNumber(item.points)}</p>
            <p className="text-micro text-ink-400">{item.decisionCount} karar</p>
          </div>
        );
      })}
    </div>
  );
}

export function LeaderboardPage({ period }: { period: LeaderboardPeriod }) {
  const navigate = useNavigate();
  const leaderboard = useQuery({
    queryKey: queryKeys.gamification.leaderboard(period),
    queryFn: () => getLeaderboard(period),
  });

  const items = leaderboard.data?.items ?? [];
  const rest = items.slice(3);

  return (
    <div>
      <PageHeader title="Liderlik tablosu" description="Analist puanları ve karar hacmi." />

      <div className="mb-5">
        <Tabs
          items={[
            { value: 'daily', label: 'Günlük' },
            { value: 'weekly', label: 'Haftalık' },
          ]}
          value={period}
          onValueChange={(value) =>
            void navigate({
              to: '/supervisor/leaderboard',
              search: { period: value as LeaderboardPeriod },
            })
          }
        />
      </div>

      <section aria-live="polite">
        {leaderboard.isPending ? <SkeletonList rows={6} /> : null}
        {leaderboard.isError ? (
          <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} />
        ) : null}
        {!leaderboard.isPending && !leaderboard.isError && items.length === 0 ? (
          <EmptyState illustration="reward" title="Bu dönemde sıralama oluşmadı" />
        ) : null}

        {items.length > 0 ? <Podium items={items} /> : null}

        {rest.length > 0 ? (
          <div className="surface-panel divide-y divide-ink-100 overflow-hidden">
            {rest.map((item) => (
              <div
                key={item.analystId}
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 px-4 py-3"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-canvas font-bold text-ink-500">
                  {item.rank}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={item.displayName ?? item.analystId} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">
                      {item.displayName ?? 'Analist'}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {item.level} · {item.decisionCount} karar · {item.badgeCount} rozet
                    </p>
                  </div>
                </div>
                <p className="font-bold tabular text-brand-800">{formatNumber(item.points)}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
