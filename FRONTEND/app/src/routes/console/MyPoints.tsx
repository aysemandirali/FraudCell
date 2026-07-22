import { Award, Lock, TrendingUp, Trophy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDateTime, formatNumber } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  SectionTitle,
  Skeleton,
  SkeletonList,
} from '@/components/ui';
import { useBadges, useMyScore, usePointHistory } from '@/hooks/queries';
import { levelProgress } from '@/domain/gamification';
import { POINT_RULE_LABEL, type Badge as BadgeType, type PointEntry } from '@/domain/types';

/**
 * Analist profili: puan, seviye, rozetler ve puan defteri (PRF-001..007).
 *
 * Puanlar tek bir "toplam" alanı değil, değiştirilemez bir ledger'dan gelir —
 * her satır hangi kuraldan kaç puan geldiğini gösterir (doküman §17).
 */
export default function MyPoints() {
  const { data: score, isPending: scorePending } = useMyScore();
  const { data: badges, isPending: badgesPending } = useBadges();
  const { data: points, isPending: pointsPending } = usePointHistory();

  return (
    <div className="space-y-6">
      <SectionTitle>Puanlarım</SectionTitle>

      {/* --------------------------------------------------- Özet kartı -- */}
      {scorePending || !score ? (
        <Card>
          <Skeleton className="h-28 w-full" />
        </Card>
      ) : (
        <ScoreSummary
          totalPoints={score.totalPoints}
          dailyPoints={score.dailyPoints}
          weeklyPoints={score.weeklyPoints}
          resolvedCases={score.resolvedCases}
          activeCases={score.activeCases}
          accuracy={score.accuracy}
          dailyRank={score.dailyRank}
          weeklyRank={score.weeklyRank}
        />
      )}

      {/* ------------------------------------------------------ Rozetler -- */}
      <section>
        <SectionTitle>Rozetler</SectionTitle>
        {badgesPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-card" />
            ))}
          </div>
        ) : !badges || badges.length === 0 ? (
          <EmptyState icon={<Award />} title="Henüz rozet tanımı yok" />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <li key={badge.code}>
                <BadgeCard badge={badge} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------- Puan defteri -- */}
      <section>
        <SectionTitle>Puan Geçmişi</SectionTitle>
        {pointsPending ? (
          <SkeletonList rows={4} />
        ) : !points || points.items.length === 0 ? (
          <EmptyState
            icon={<Trophy />}
            title="Henüz puan kaydın yok"
            description="Vaka kararı verdiğinde puanların burada kırılımıyla görünecek."
          />
        ) : (
          <Card flush>
            <ul className="divide-y divide-ink-100">
              {points.items.map((entry) => (
                <li key={entry.id}>
                  <PointRow entry={entry} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

/* ----------------------------------------------------------- Özet kartı -- */

function ScoreSummary({
  totalPoints,
  dailyPoints,
  weeklyPoints,
  resolvedCases,
  activeCases,
  accuracy,
  dailyRank,
  weeklyRank,
}: {
  totalPoints: number;
  dailyPoints: number;
  weeklyPoints: number;
  resolvedCases: number;
  activeCases: number;
  accuracy: number;
  dailyRank: number;
  weeklyRank: number;
}) {
  const { level, next, ratio, remaining } = levelProgress(totalPoints);

  return (
    <Card className="gradient-header text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/75">Toplam puan</p>
          <p className="text-4xl font-bold tabular">{formatNumber(totalPoints)}</p>
        </div>
        <span className={cn('rounded-pill px-3 py-1.5 text-sm font-semibold', level.chip)}>
          {level.label}
        </span>
      </div>

      {/* Seviye ilerlemesi */}
      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-700"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/75">
          {next
            ? `${formatNumber(remaining)} puan sonra ${next.label}`
            : 'En yüksek seviyedesin'}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4 sm:grid-cols-4">
        <Stat label="Bugün" value={`+${formatNumber(dailyPoints)}`} caption={`${dailyRank}. sıra`} />
        <Stat
          label="Bu hafta"
          value={`+${formatNumber(weeklyPoints)}`}
          caption={`${weeklyRank}. sıra`}
        />
        <Stat
          label="Çözülen vaka"
          value={formatNumber(resolvedCases)}
          caption={`${activeCases} aktif`}
        />
        <Stat
          label="Doğruluk"
          value={`%${Math.round(accuracy * 100)}`}
          caption="doğru karar oranı"
        />
      </dl>
    </Card>
  );
}

function Stat({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div>
      <dt className="text-xs text-white/70">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular">{value}</dd>
      <p className="text-[11px] text-white/60">{caption}</p>
    </div>
  );
}

/* -------------------------------------------------------------- Rozetler -- */

function BadgeCard({ badge }: { badge: BadgeType }) {
  const earned = badge.earnedAt !== null;

  return (
    <div
      className={cn(
        'surface-card h-full p-4',
        !earned && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            earned ? 'bg-tc-100 text-[#b38c00]' : 'bg-ink-100 text-ink-400',
          )}
          aria-hidden
        >
          {earned ? <Award className="size-6" /> : <Lock className="size-5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink-900">{badge.name}</p>
          <p className="mt-0.5 text-sm text-ink-500">{badge.description}</p>
        </div>
      </div>

      {earned ? (
        <p className="mt-3 text-xs font-medium text-success-700">
          Kazanıldı · {formatDateTime(badge.earnedAt!)}
        </p>
      ) : (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-700"
              style={{ width: `${Math.round(badge.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-ink-400 tabular">{badge.progressLabel}</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- Puan satırı -- */

function PointRow({ entry }: { entry: PointEntry }) {
  const negative = entry.points < 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          negative ? 'bg-danger-100 text-danger-700' : 'bg-success-100 text-success-700',
        )}
        aria-hidden
      >
        <TrendingUp className={cn('size-4.5', negative && 'rotate-180')} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-ink-900">
          {POINT_RULE_LABEL[entry.ruleCode]}
        </p>
        <p className="text-xs text-ink-400">
          {entry.caseNo ? `${entry.caseNo} · ` : ''}
          {formatDateTime(entry.occurredAt)}
        </p>
      </div>

      <Badge tone={negative ? 'danger' : 'success'}>
        {negative ? '' : '+'}
        {entry.points}
      </Badge>
    </div>
  );
}
