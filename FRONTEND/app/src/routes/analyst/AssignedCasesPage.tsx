import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
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

  return (
    <div>
      <PageHeader
        title="Vakalarım"
        description="SLA önceliğine göre atanmış incelemeler."
      />

      <div className="mb-5">
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

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((riskCase) => {
          const level = riskCase.effectiveRisk.riskLevel ?? UNKNOWN_RISK;
          const tone = riskTone(level);
          return (
            <Link
              key={riskCase.caseId}
              to="/analyst/cases/$caseId"
              params={{ caseId: riskCase.caseId }}
              className="surface-panel relative flex items-center overflow-hidden p-5 transition-shadow hover:shadow-raised"
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
              <ChevronRight className="size-5 shrink-0 text-ink-400" aria-hidden />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
