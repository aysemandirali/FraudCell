import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Bell,
  CreditCard,
  Plus,
  Receipt,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useSession } from '@/features/authentication/useSession';
import { listTransactions } from '@/features/transactions/api';
import { listPendingVerifications } from '@/features/customer/api';
import { queryKeys } from '@/shared/api/query-keys';
import { TRANSACTION_TYPE_LABEL } from '@/shared/api/enums';
import { formatMoney, formatRelative } from '@/shared/lib/format';
import { DISPLAY_RISK_LABEL, riskTone } from '@/shared/lib/risk';
import { EmptyState, ErrorState, SkeletonList, ToneBadge } from '@/shared/ui';

const QUICK_ACTIONS = [
  { to: '/customer/transactions/new', label: 'Yeni işlem', icon: Plus, tint: 'bg-brand-100 text-brand-700' },
  { to: '/customer/transactions', label: 'İşlemlerim', icon: Receipt, tint: 'bg-aqua-50 text-aqua-700' },
  { to: '/customer/verifications', label: 'Doğrulama', icon: ShieldCheck, tint: 'bg-success-100 text-success-700' },
  { to: '/customer/notifications', label: 'Bildirimler', icon: Bell, tint: 'bg-tc-100 text-warning-700' },
] as const;

export function CustomerHomePage() {
  const { user } = useSession();
  const transactions = useQuery({
    queryKey: queryKeys.transactions.list({ limit: 5 }),
    queryFn: () => listTransactions({ limit: 5 }),
  });
  const verifications = useQuery({
    queryKey: queryKeys.pendingVerifications,
    queryFn: listPendingVerifications,
  });

  const pendingCount = verifications.data?.length ?? 0;
  const secure = pendingCount === 0;

  return (
    <div>
      {/* Kahraman blok — güvenlik durumu */}
      <header className="relative overflow-hidden gradient-header text-white">
        <div className="hero-mesh absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-lg px-5 pt-7 pb-9">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-white/75">Merhaba</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold">
                {user?.firstName ?? 'FraudCell müşterisi'}
              </h1>
            </div>
            <Link
              to="/customer/notifications"
              aria-label="Bildirimler"
              className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/12 ring-1 ring-white/20 transition-colors hover:bg-white/20"
            >
              <Bell className="size-5" aria-hidden />
            </Link>
          </div>

          {/* Güvenlik durumu kartı */}
          <div className="mt-5 flex items-center gap-4 rounded-card bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <span
              className={`flex size-12 shrink-0 items-center justify-center rounded-full ${
                secure ? 'bg-success-500/90' : 'bg-tc-500'
              }`}
            >
              {secure ? (
                <ShieldCheck className="size-6 text-white" aria-hidden />
              ) : (
                <ShieldAlert className="size-6 text-brand-900" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {secure ? 'Hesabın güvende' : `${pendingCount} işlem yanıtını bekliyor`}
              </p>
              <p className="mt-0.5 text-sm text-white/75">
                {secure
                  ? 'Bekleyen bir güvenlik kontrolü yok.'
                  : 'Sana ait olup olmadığını doğrula.'}
              </p>
            </div>
            {!secure && (
              <Link
                to="/customer/verifications"
                className="shrink-0 rounded-pill bg-white px-3.5 py-2 text-sm font-semibold text-brand-800"
              >
                Doğrula
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hızlı aksiyonlar */}
      <section className="mx-auto -mt-5 max-w-lg px-4" aria-label="Hızlı işlemler">
        <div className="grid grid-cols-4 gap-2 rounded-card bg-surface p-3 shadow-card">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, tint }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-tile p-2 text-center transition-colors hover:bg-canvas"
            >
              <span className={`flex size-11 items-center justify-center rounded-tile ${tint}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="text-micro font-medium text-ink-600">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Son işlemler */}
      <section className="mx-auto max-w-lg px-4 py-6" aria-labelledby="recent-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="recent-title" className="text-h2 text-ink-900">
            Son işlemler
          </h2>
          <Link
            to="/customer/transactions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
          >
            Tümünü gör <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        {transactions.isPending ? <SkeletonList rows={3} /> : null}
        {transactions.isError ? (
          <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
        ) : null}
        {transactions.data?.items.length === 0 ? (
          <EmptyState
            illustration="transactions"
            title="Henüz işlem yok"
            description="İlk işlemini oluşturduğunda burada güvenlik durumuyla birlikte görünecek."
            action={
              <Link
                to="/customer/transactions/new"
                className="gradient-brand inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold text-white shadow-raised"
              >
                <Plus className="size-4" /> İlk işlemi oluştur
              </Link>
            }
          />
        ) : null}

        <div className="space-y-2.5">
          {transactions.data?.items.map((item) => {
            const level = item.displayRiskLevel;
            const tone = riskTone(level);
            return (
              <Link
                key={item.transactionId}
                to="/customer/transactions/$transactionId"
                params={{ transactionId: item.transactionId }}
                className="surface-card flex items-center gap-3.5 p-4 transition-shadow hover:shadow-raised"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-brand-50 text-brand-600">
                  <CreditCard className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {item.transactionNo}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {TRANSACTION_TYPE_LABEL[item.transactionType]} · {formatRelative(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="font-semibold tabular text-ink-900">
                    {formatMoney(item.amount, item.currency)}
                  </p>
                  <ToneBadge toneClass={tone.chip} className="px-2 py-0.5 text-micro">
                    {DISPLAY_RISK_LABEL[level]}
                  </ToneBadge>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
