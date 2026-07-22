import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronRight, ListTodo } from 'lucide-react';
import { listAssignmentQueue } from '@/features/cases/api';
import type { QueueType } from '@/shared/api/enums';
import { ASSIGNMENT_STATUS_LABEL, RISK_LEVEL_LABEL } from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime } from '@/shared/lib/format';
import { riskTone } from '@/shared/lib/risk';
import { cn } from '@/shared/lib/cn';
import { EmptyState, ErrorState, SkeletonList, ToneBadge } from '@/shared/ui';

export function AssignmentQueuePage({ queueType }: { queueType: QueueType }) {
  const queue = useQuery({
    queryKey: queryKeys.cases.assignmentQueue(queueType),
    queryFn: () => listAssignmentQueue({ queueType, limit: 100 }),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Atama kuyruğu</h1>
          <p className="mt-1 text-sm text-ink-500">Analist bekleyen vakalar.</p>
        </div>
        <div className="inline-flex rounded-md bg-ink-100 p-1" role="group" aria-label="Kuyruk tipi">
          {(['QUEUED', 'MANUAL_QUEUE'] as const).map((value) => (
            <Link
              key={value}
              to="/supervisor/queue"
              search={{ queueType: value }}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-semibold',
                queueType === value ? 'bg-surface text-brand-700 shadow-card' : 'text-ink-500',
              )}
            >
              {value === 'QUEUED' ? 'Otomatik' : 'Manuel'}
            </Link>
          ))}
        </div>
      </header>

      <section className="mt-6">
        {queue.isPending ? <SkeletonList rows={5} /> : null}
        {queue.isError ? <ErrorState error={queue.error} onRetry={() => void queue.refetch()} /> : null}
        {queue.data?.items.length === 0 ? <EmptyState icon={<ListTodo />} title="Bu kuyrukta vaka yok" /> : null}
        <div className="space-y-3">
          {queue.data?.items.map((item) => {
            const riskLevel = item.displayRiskLevel === 'BELIRSIZ' ? null : item.displayRiskLevel;
            const tone = riskTone(riskLevel);
            return (
              <Link key={item.caseId} to="/supervisor/cases/$caseId" params={{ caseId: item.caseId }} className="surface-card relative grid min-h-24 grid-cols-[1fr_auto] items-center gap-4 overflow-hidden p-4 transition-shadow hover:shadow-raised">
                <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden />
                <div className="min-w-0 pl-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{item.transactionNo}</p>
                    <ToneBadge toneClass={tone.chip}>{riskLevel ? RISK_LEVEL_LABEL[riskLevel] : 'Belirsiz'}</ToneBadge>
                    <ToneBadge toneClass="bg-ink-100 text-ink-600">{ASSIGNMENT_STATUS_LABEL[item.assignmentStatus]}</ToneBadge>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">{item.manualReviewReason ?? 'Atama adayı bekleniyor'}</p>
                  <p className="mt-1 text-xs text-ink-400">SLA: {formatDateTime(item.slaDeadlineAt)}</p>
                </div>
                <ChevronRight className="size-5 text-ink-400" aria-hidden />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

