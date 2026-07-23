import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRight, Plus } from 'lucide-react';
import { listTransactions } from '@/features/transactions/api';
import { RISK_LEVELS, type RiskLevel } from '@/shared/api/enums';
import {
  ASSESSMENT_STATUS_LABEL,
  CONTROL_STATUS_LABEL,
  TRANSACTION_TYPE_LABEL,
} from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { DISPLAY_RISK_LABEL, riskTone } from '@/shared/lib/risk';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterChips,
  SkeletonList,
  ToneBadge,
  type ChipOption,
} from '@/shared/ui';

const RISK_OPTIONS: ChipOption<RiskLevel>[] = RISK_LEVELS.map((level) => ({
  value: level,
  label: DISPLAY_RISK_LABEL[level],
}));

export function CustomerTransactionsPage({ riskLevel }: { riskLevel?: RiskLevel }) {
  const navigate = useNavigate();
  const filters = { riskLevel, limit: 50 };
  const transactions = useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => listTransactions(filters),
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-7xl lg:px-6 lg:py-8 xl:px-8">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink-900">İşlemlerim</h1>
          <p className="mt-1 text-body text-ink-500">
            Risk değerlendirmelerini ve kontrol durumlarını izle.
          </p>
        </div>
        <Link to="/customer/transactions/new">
          <Button size="sm" aria-label="Yeni işlem" leadingIcon={<Plus className="size-4" />}>
            Yeni
          </Button>
        </Link>
      </header>

      <div className="mb-5">
        <FilterChips
          options={RISK_OPTIONS}
          value={riskLevel}
          onChange={(next) =>
            void navigate({
              to: '/customer/transactions',
              search: next ? { riskLevel: next } : {},
            })
          }
        />
      </div>

      {transactions.isPending ? (
        <SkeletonList rows={5} className="lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0" />
      ) : null}
      {transactions.isError ? (
        <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
      ) : null}
      {transactions.data?.items.length === 0 ? (
        <EmptyState
          illustration="search"
          title="İşlem bulunamadı"
          description={
            riskLevel ? 'Bu risk seviyesinde işlem yok. Filtreyi temizlemeyi dene.' : undefined
          }
          action={
            riskLevel ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void navigate({ to: '/customer/transactions', search: {} })}
              >
                Filtreyi temizle
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {transactions.data?.items.map((item) => {
          const level = item.displayRiskLevel;
          const tone = riskTone(level);
          return (
            <Link
              key={item.transactionId}
              to="/customer/transactions/$transactionId"
              params={{ transactionId: item.transactionId }}
              className="surface-card relative flex min-h-28 items-center overflow-hidden p-4 transition-shadow hover:shadow-raised"
            >
              <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden />
              <div className="min-w-0 flex-1 pl-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink-900">{item.transactionNo}</p>
                  <ToneBadge toneClass={tone.chip}>
                    {item.assessmentStatus === 'COMPLETED'
                      ? DISPLAY_RISK_LABEL[level]
                      : ASSESSMENT_STATUS_LABEL[item.assessmentStatus]}
                  </ToneBadge>
                </div>
                <p className="mt-2 text-xl font-bold tabular text-ink-900">
                  {formatMoney(item.amount, item.currency)}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {TRANSACTION_TYPE_LABEL[item.transactionType]} · {formatDateTime(item.createdAt)} ·{' '}
                  {CONTROL_STATUS_LABEL[item.controlStatus]}
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
