import { useState } from 'react';
import { Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber, initials } from '@/lib/format';
import { Badge, Card, EmptyState, SectionTitle, SkeletonList, Tabs } from '@/components/ui';
import { useLeaderboard } from '@/hooks/queries';
import { levelForPoints } from '@/domain/gamification';
import type { LeaderboardEntry } from '@/domain/types';

type Period = 'daily' | 'weekly';

/** İlk üç sıranın madalya rengi. */
const MEDAL: Record<number, string> = {
  1: 'text-tc-500',
  2: 'text-ink-400',
  3: 'text-[#b3763a]',
};

/** Günlük ve haftalık liderlik tablosu — ilk 10 (LDB-001..003). */
export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('daily');
  const { data, isPending } = useLeaderboard(period);

  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <SectionTitle>Liderlik Tablosu</SectionTitle>

      <Card flush>
        <Tabs<Period>
          items={[
            { value: 'daily', label: 'Günlük' },
            { value: 'weekly', label: 'Haftalık' },
          ]}
          value={period}
          onChange={setPeriod}
          className="rounded-t-card"
        />

        {isPending ? (
          <div className="p-4">
            <SkeletonList rows={5} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Trophy />}
            title="Sıralama henüz oluşmadı"
            description="Bu dönemde puan kazanan analist yok."
          />
        ) : (
          <ol className="divide-y divide-ink-100">
            {rows.slice(0, 10).map((entry) => (
              <li key={entry.analystId}>
                <LeaderboardRow entry={entry} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Sıralama, puan defterinden anlık olarak hesaplanır. Vaka kararı verildiğinde puan
        Gamification servisine event ile ulaşır; tablo bir sonraki yenilemede güncellenir.
      </p>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const level = levelForPoints(entry.points);
  const medal = MEDAL[entry.rank];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5',
        // Oturumdaki kullanıcının satırı vurgulanır.
        entry.isCurrentUser && 'bg-brand-50',
      )}
    >
      <span className="flex w-8 shrink-0 justify-center">
        {medal ? (
          <Medal className={cn('size-6', medal)} aria-label={`${entry.rank}. sıra`} />
        ) : (
          <span className="text-sm font-semibold text-ink-400 tabular">{entry.rank}</span>
        )}
      </span>

      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          entry.isCurrentUser ? 'bg-brand-800 text-white' : 'bg-ink-100 text-ink-700',
        )}
        aria-hidden
      >
        {initials(entry.analystName)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-ink-900">
          {entry.analystName}
          {entry.isCurrentUser && <Badge tone="brand">Sen</Badge>}
        </p>
        <p className="text-xs text-ink-500 tabular">
          {entry.resolvedCases} vaka · %{Math.round(entry.accuracy * 100)} doğruluk
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[15px] font-bold text-ink-900 tabular">{formatNumber(entry.points)}</p>
        <span className={cn('rounded-pill px-2 py-0.5 text-[10px] font-semibold', level.chip)}>
          {level.label}
        </span>
      </div>
    </div>
  );
}
