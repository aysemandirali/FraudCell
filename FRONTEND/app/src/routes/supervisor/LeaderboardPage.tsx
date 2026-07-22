import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Medal, Trophy } from 'lucide-react';
import { getLeaderboard } from '@/features/gamification/api';
import type { LeaderboardPeriod } from '@/shared/api/contract';
import { queryKeys } from '@/shared/api/query-keys';
import { formatNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { EmptyState, ErrorState, SkeletonList } from '@/shared/ui';

export function LeaderboardPage({ period }: { period: LeaderboardPeriod }) {
  const leaderboard = useQuery({
    queryKey: queryKeys.gamification.leaderboard(period),
    queryFn: () => getLeaderboard(period),
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-ink-900">Liderlik tablosu</h1><p className="mt-1 text-sm text-ink-500">Analist puanları ve karar hacmi.</p></div>
        <div className="inline-flex rounded-tile bg-ink-100 p-1" role="group" aria-label="Dönem">
          {(['daily', 'weekly'] as const).map((value) => (
            <Link key={value} to="/supervisor/leaderboard" search={{ period: value }} className={cn('rounded-md px-4 py-2 text-sm font-semibold', period === value ? 'bg-white text-brand-700 shadow-card' : 'text-ink-500')}>
              {value === 'daily' ? 'Günlük' : 'Haftalık'}
            </Link>
          ))}
        </div>
      </header>

      <section className="mt-6" aria-live="polite">
        {leaderboard.isPending ? <SkeletonList rows={6} /> : null}
        {leaderboard.isError ? <ErrorState error={leaderboard.error} onRetry={() => void leaderboard.refetch()} /> : null}
        {leaderboard.data?.items.length === 0 ? <EmptyState icon={<Trophy />} title="Bu dönemde sıralama oluşmadı" /> : null}
        <div className="divide-y divide-ink-100 bg-surface">
          {leaderboard.data?.items.map((item) => (
            <div key={item.analystId} className="grid min-h-20 grid-cols-[3rem_1fr_auto] items-center gap-4 px-4 py-3">
              <span className={cn('flex size-9 items-center justify-center rounded-full font-bold', item.rank <= 3 ? 'bg-tc-100 text-warning-700' : 'bg-ink-100 text-ink-500')}>
                {item.rank <= 3 ? <Medal className="size-5" aria-label={`${item.rank}. sıra`} /> : item.rank}
              </span>
              <div className="min-w-0"><p className="truncate font-semibold text-ink-900">{item.displayName ?? item.analystId}</p><p className="mt-1 text-xs text-ink-500">{item.level} · {item.decisionCount} karar · {item.badgeCount} rozet</p></div>
              <p className="font-bold tabular text-brand-800">{formatNumber(item.points)} puan</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
