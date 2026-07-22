import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, FolderSearch } from 'lucide-react';
import { listCases } from '@/features/cases/api';
import type { CaseStatus, RiskLevel } from '@/shared/api/enums';
import {
  CASE_STATUSES,
  CASE_STATUS_LABEL,
  FRAUD_TYPE_LABEL,
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
} from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { riskTone } from '@/shared/lib/risk';
import { Button, EmptyState, ErrorState, SkeletonList, SlaCountdown, ToneBadge } from '@/shared/ui';

export function SupervisorCasesPage({
  status,
  riskLevel,
  cursor,
}: {
  status?: CaseStatus;
  riskLevel?: RiskLevel;
  cursor?: string;
}) {
  const navigate = useNavigate();
  const filters = { status, riskLevel, cursor };
  const cases = useQuery({
    queryKey: queryKeys.cases.list(filters),
    queryFn: () => listCases({ ...filters, limit: 30 }),
  });

  const setFilters = (next: { status?: CaseStatus; riskLevel?: RiskLevel }) => {
    void navigate({ to: '/supervisor/cases', search: { ...next } });
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Tüm vakalar</h1>
          <p className="mt-1 text-sm text-ink-500">Risk ve durum bazında operasyon görünümü.</p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <label className="text-xs font-semibold text-ink-500">
            Durum
            <select
              aria-label="Vaka durumu"
              value={status ?? ''}
              onChange={(event) =>
                setFilters({
                  status: (event.target.value || undefined) as CaseStatus | undefined,
                  riskLevel,
                })
              }
              className="mt-1 h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-sm text-ink-800"
            >
              <option value="">Tümü</option>
              {CASE_STATUSES.map((value) => <option key={value} value={value}>{CASE_STATUS_LABEL[value]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-500">
            Risk
            <select
              aria-label="Risk seviyesi"
              value={riskLevel ?? ''}
              onChange={(event) =>
                setFilters({
                  status,
                  riskLevel: (event.target.value || undefined) as RiskLevel | undefined,
                })
              }
              className="mt-1 h-10 w-full rounded-md border border-ink-200 bg-surface px-3 text-sm text-ink-800"
            >
              <option value="">Tümü</option>
              {RISK_LEVELS.map((value) => <option key={value} value={value}>{RISK_LEVEL_LABEL[value]}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section className="mt-6">
        {cases.isPending ? <SkeletonList rows={6} /> : null}
        {cases.isError ? <ErrorState error={cases.error} onRetry={() => void cases.refetch()} /> : null}
        {cases.data?.items.length === 0 ? <EmptyState icon={<FolderSearch />} title="Bu filtrede vaka bulunamadı" /> : null}
        <div className="grid gap-3 lg:grid-cols-2">
          {cases.data?.items.map((riskCase) => {
            const tone = riskTone(riskCase.effectiveRisk.riskLevel);
            return (
              <Link key={riskCase.caseId} to="/supervisor/cases/$caseId" params={{ caseId: riskCase.caseId }} className="surface-card relative flex min-h-36 overflow-hidden p-5 transition-shadow hover:shadow-raised">
                <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden />
                <div className="min-w-0 flex-1 pl-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{riskCase.transaction.transactionNo}</p>
                    <ToneBadge toneClass={tone.chip}>{riskCase.effectiveRisk.riskLevel ? RISK_LEVEL_LABEL[riskCase.effectiveRisk.riskLevel] : 'Belirsiz'}</ToneBadge>
                    <SlaCountdown sla={riskCase.sla} compact />
                  </div>
                  <p className="mt-3 text-xl font-bold tabular text-ink-900">{formatMoney(riskCase.transaction.amount, riskCase.transaction.currency)}</p>
                  <p className="mt-1 text-sm text-ink-500">{riskCase.effectiveRisk.fraudType ? FRAUD_TYPE_LABEL[riskCase.effectiveRisk.fraudType] : 'Risk tipi bekleniyor'}</p>
                  <p className="mt-2 text-xs text-ink-400">{CASE_STATUS_LABEL[riskCase.status]} · {formatDateTime(riskCase.createdAt)}</p>
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-ink-400" aria-hidden />
              </Link>
            );
          })}
        </div>
        {cases.data?.page.hasMore && cases.data.page.nextCursor ? (
          <div className="mt-6 flex justify-center">
            <Link to="/supervisor/cases" search={{ status, riskLevel, cursor: cases.data.page.nextCursor }}>
              <Button variant="secondary">Daha fazla göster</Button>
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

