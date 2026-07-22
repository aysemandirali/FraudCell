import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { listCases } from '@/features/cases/api';
import type { CaseResponse } from '@/shared/api/contract';
import {
  CASE_STATUSES,
  CASE_STATUS_LABEL,
  FRAUD_TYPE_LABEL,
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
  type CaseStatus,
  type RiskLevel,
} from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatMoney, formatRelative } from '@/shared/lib/format';
import { riskTone, UNKNOWN_RISK, DISPLAY_RISK_LABEL } from '@/shared/lib/risk';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  PageHeader,
  SlaCountdown,
  ToneBadge,
  type ChipOption,
} from '@/shared/ui';

const STATUS_OPTIONS: ChipOption<CaseStatus>[] = CASE_STATUSES.map((status) => ({
  value: status,
  label: CASE_STATUS_LABEL[status],
}));

const RISK_OPTIONS: ChipOption<RiskLevel>[] = RISK_LEVELS.map((level) => ({
  value: level,
  label: RISK_LEVEL_LABEL[level],
}));

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

  const setSearch = (next: Record<string, string | undefined>) => {
    void navigate({ to: '/supervisor/cases', search: { status, riskLevel, ...next } });
  };

  const columns = useMemo<ColumnDef<CaseResponse, unknown>[]>(
    () => [
      {
        id: 'transactionNo',
        header: 'İşlem',
        accessorFn: (row) => row.transaction.transactionNo,
        cell: (ctx) => (
          <span className="font-semibold text-ink-900">{ctx.getValue<string>()}</span>
        ),
      },
      {
        id: 'amount',
        header: 'Tutar',
        accessorFn: (row) => row.transaction.amount,
        cell: (ctx) => (
          <span className="tabular font-medium">
            {formatMoney(ctx.row.original.transaction.amount, ctx.row.original.transaction.currency)}
          </span>
        ),
      },
      {
        id: 'risk',
        header: 'Risk',
        accessorFn: (row) => row.effectiveRisk.riskScore ?? -1,
        cell: (ctx) => {
          const level = ctx.row.original.effectiveRisk.riskLevel ?? UNKNOWN_RISK;
          return <ToneBadge toneClass={riskTone(level).chip}>{DISPLAY_RISK_LABEL[level]}</ToneBadge>;
        },
      },
      {
        id: 'fraudType',
        header: 'Tip',
        accessorFn: (row) => row.effectiveRisk.fraudType ?? '',
        cell: (ctx) => {
          const type = ctx.row.original.effectiveRisk.fraudType;
          return (
            <span className="text-ink-600">{type ? FRAUD_TYPE_LABEL[type] : '—'}</span>
          );
        },
      },
      {
        id: 'status',
        header: 'Durum',
        accessorFn: (row) => row.status,
        cell: (ctx) => (
          <span className="text-ink-600">{CASE_STATUS_LABEL[ctx.row.original.status]}</span>
        ),
      },
      {
        id: 'sla',
        header: 'SLA',
        enableSorting: false,
        cell: (ctx) => <SlaCountdown sla={ctx.row.original.sla} compact />,
      },
      {
        id: 'createdAt',
        header: 'Oluşturma',
        accessorFn: (row) => row.createdAt,
        cell: (ctx) => (
          <span className="whitespace-nowrap text-caption text-ink-400">
            {formatRelative(ctx.row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader title="Tüm vakalar" description="Risk ve durum bazında operasyon görünümü." />

      <div className="mb-4 space-y-3">
        <FilterChips
          options={STATUS_OPTIONS}
          value={status}
          onChange={(next) => setSearch({ status: next, cursor: undefined })}
        />
        <FilterChips
          options={RISK_OPTIONS}
          value={riskLevel}
          allLabel="Tüm riskler"
          onChange={(next) => setSearch({ riskLevel: next, cursor: undefined })}
        />
      </div>

      {cases.isError ? (
        <ErrorState error={cases.error} onRetry={() => void cases.refetch()} />
      ) : (
        <DataTable
          data={cases.data?.items ?? []}
          columns={columns}
          isLoading={cases.isPending}
          rowKey={(row) => row.caseId}
          onRowClick={(row) =>
            void navigate({ to: '/supervisor/cases/$caseId', params: { caseId: row.caseId } })
          }
          empty={
            <EmptyState
              illustration="search"
              title="Bu filtrede vaka bulunamadı"
              description="Filtreleri gevşetmeyi dene."
            />
          }
        />
      )}

      {cases.data?.page.hasMore && cases.data.page.nextCursor ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setSearch({ cursor: cases.data?.page.nextCursor ?? undefined })}
          >
            Daha fazla göster
          </Button>
        </div>
      ) : null}
    </div>
  );
}
