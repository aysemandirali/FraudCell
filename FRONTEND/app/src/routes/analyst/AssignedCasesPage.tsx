import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, ChevronRight, Clock3, FolderKanban, ScanSearch } from 'lucide-react';
import { listAssignedCases } from '@/features/cases/api';
import { CASE_STATUSES, type CaseStatus } from '@/shared/api/enums';
import { CASE_STATUS_LABEL, FRAUD_TYPE_LABEL } from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatMoney, formatRelative } from '@/shared/lib/format';
import { riskTone, UNKNOWN_RISK, DISPLAY_RISK_LABEL } from '@/shared/lib/risk';
import {
  EmptyState,
  ErrorState,
  FilterChips,
  PageHeader,
  SkeletonList,
  SlaCountdown,
  StatTile,
  ToneBadge,
  type ChipOption,
} from '@/shared/ui';

const STATUS_OPTIONS: ChipOption<CaseStatus>[] = CASE_STATUSES.map((status) => ({
  value: status,
  label: CASE_STATUS_LABEL[status],
}));

export function AssignedCasesPage({ status }: { status?: CaseStatus }) {
  const navigate = useNavigate();
  const cases = useQuery({
    queryKey: queryKeys.cases.assigned({ status }),
    queryFn: () => listAssignedCases({ status, limit: 50 }),
  });

  const items = cases.data?.items ?? [];
  const urgentCount = items.filter((item) => ['URGENT', 'BREACHED'].includes(item.sla.status)).length;
  const criticalCount = items.filter((item) => item.effectiveRisk.riskLevel === 'KRITIK').length;
  const reviewingCount = items.filter((item) => item.status === 'INCELENIYOR').length;

  return (
    <div>
      <PageHeader
        title="Analist çalışma alanı"
        description="Atanmış vakalarını SLA önceliği, risk seviyesi ve inceleme durumuyla birlikte yönet."
      />

      {!cases.isPending && !cases.isError ? (
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Vaka özeti">
          <StatTile label="Aktif vaka" value={items.length} hint="Sana atanmış kayıtlar" icon={<FolderKanban className="size-5" />} />
          <StatTile label="Acil SLA" value={urgentCount} hint="Öncelikli müdahale" tone={urgentCount > 0 ? 'text-danger-600' : 'text-ink-900'} icon={<Clock3 className="size-5" />} />
          <StatTile label="Kritik risk" value={criticalCount} hint="Yüksek risk sinyali" tone={criticalCount > 0 ? 'text-warning-700' : 'text-ink-900'} icon={<AlertTriangle className="size-5" />} />
          <StatTile label="İnceleniyor" value={reviewingCount} hint="Devam eden çalışma" icon={<ScanSearch className="size-5" />} />
        </section>
      ) : null}

      <div className="surface-elevated mb-5 p-2.5 sm:p-3">
        <FilterChips
          options={STATUS_OPTIONS}
          value={status}
          onChange={(next) =>
            void navigate({ to: '/analyst', search: next ? { status: next } : {} })
          }
        />
      </div>

      {cases.isPending ? <SkeletonList rows={5} /> : null}
      {cases.isError ? <ErrorState error={cases.error} onRetry={() => void cases.refetch()} /> : null}
      {!cases.isPending && !cases.isError && items.length === 0 ? (
        <EmptyState
          illustration="secure"
          title="Atanmış açık vaka yok"
          description="Yeni atamalar sana canlı olarak düşecek."
        />
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-3">
        {items.map((riskCase) => {
          const level = riskCase.effectiveRisk.riskLevel ?? UNKNOWN_RISK;
          const tone = riskTone(level);
          return (
            <Link
              key={riskCase.caseId}
              to="/analyst/cases/$caseId"
              params={{ caseId: riskCase.caseId }}
              className="surface-panel group relative flex min-h-44 items-center overflow-hidden p-5 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-raised"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden />
              <div className="min-w-0 flex-1 pl-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{riskCase.transaction.transactionNo}</p>
                  <ToneBadge toneClass={tone.chip}>{DISPLAY_RISK_LABEL[level]}</ToneBadge>
                  <SlaCountdown sla={riskCase.sla} compact />
                </div>
                <p className="mt-3 text-xl font-bold tabular text-ink-900">
                  {formatMoney(riskCase.transaction.amount, riskCase.transaction.currency)}
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  {riskCase.effectiveRisk.fraudType
                    ? FRAUD_TYPE_LABEL[riskCase.effectiveRisk.fraudType]
                    : 'Risk tipi bekleniyor'}
                </p>
                <p className="mt-2 text-xs text-ink-400">
                  {CASE_STATUS_LABEL[riskCase.status]} · {formatRelative(riskCase.createdAt)}
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                <ChevronRight className="size-4.5" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
