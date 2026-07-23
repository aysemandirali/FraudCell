import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Activity,
  ArrowRight,
  Bell,
  CreditCard,
  LockKeyhole,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
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
  {
    to: '/customer/transactions/new',
    label: 'Yeni işlem',
    description: 'Güvenli işlem oluştur',
    icon: Plus,
    tint: 'bg-brand-950 text-white',
  },
  {
    to: '/customer/transactions',
    label: 'İşlemlerim',
    description: 'Tüm hareketleri izle',
    icon: Receipt,
    tint: 'bg-brand-100 text-brand-800',
  },
  {
    to: '/customer/verifications',
    label: 'Doğrulama',
    description: 'Bekleyen kontroller',
    icon: ShieldCheck,
    tint: 'bg-aqua-100 text-aqua-700',
  },
  {
    to: '/customer/notifications',
    label: 'Bildirimler',
    description: 'Güvenlik uyarıları',
    icon: Bell,
    tint: 'bg-tc-100 text-brand-900',
  },
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
    <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <header className="gradient-header relative overflow-hidden rounded-[1.75rem] text-white shadow-raised lg:rounded-[2rem]">
        <div className="hero-mesh absolute inset-0" aria-hidden />
        <div className="brand-grid absolute inset-0 opacity-25" aria-hidden />
        <div className="absolute -right-20 -bottom-32 size-96 rounded-full border border-white/10" aria-hidden />

        <div className="relative grid gap-7 px-5 py-7 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,.75fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-9">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-bold tracking-[0.17em] text-aqua-300 uppercase">
              <span className="size-1.5 rounded-full bg-tc-500 shadow-[0_0_0_5px_rgba(255,201,0,.12)]" />
              Turkcell dijital güvenlik
            </p>
            <h1 className="mt-4 max-w-2xl text-[2rem] leading-[1.08] font-bold tracking-[-0.045em] sm:text-[2.35rem] lg:text-[2.65rem]">
              Merhaba, {user?.firstName ?? 'Turkcell müşterisi'}.
              <span className="mt-1 block text-white/72">Hesabın kontrol altında.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/68 sm:text-[0.95rem]">
              İşlemlerin anlık olarak izleniyor; riskli bir hareket olduğunda onayın alınmadan süreç ilerlemiyor.
            </p>

            <div className="mt-6 inline-flex max-w-full items-center gap-3 rounded-pill border border-white/12 bg-white/9 py-2 pr-4 pl-2 backdrop-blur-md">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full ${secure ? 'bg-success-500' : 'bg-tc-500 text-brand-950'}`}
              >
                {secure ? <ShieldCheck className="size-4.5" aria-hidden /> : <ShieldAlert className="size-4.5" aria-hidden />}
              </span>
              <span className="truncate text-sm font-semibold">
                {secure ? 'Koruma kalkanın aktif' : `${pendingCount} işlem onayını bekliyor`}
              </span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/14 bg-brand-950/24 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-aqua-300 uppercase">Güvenlik özeti</p>
                <p className="mt-2 text-lg font-semibold">Anlık koruma merkezi</p>
              </div>
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-[1rem] bg-white text-brand-900 shadow-overlay">
                <LockKeyhole className="size-5.5" aria-hidden />
                <Sparkles className="absolute -right-1.5 -bottom-1.5 size-5 rounded-full bg-tc-500 p-1 text-brand-950 ring-2 ring-brand-700" aria-hidden />
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-white/10 bg-white/8 p-3.5">
                <dt className="text-[11px] leading-snug text-white/58">Bekleyen doğrulama</dt>
                <dd className="mt-1.5 text-2xl font-bold tabular">{pendingCount}</dd>
              </div>
              <div className="rounded-[1rem] border border-white/10 bg-white/8 p-3.5">
                <dt className="text-[11px] leading-snug text-white/58">Risk izleme</dt>
                <dd className="mt-1.5 flex items-center gap-2 text-base font-bold">
                  <Activity className="size-4 text-aqua-300" aria-hidden /> Canlı
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-2 -mt-4 sm:mx-5 lg:mx-8" aria-label="Hızlı işlemler">
        <div className="surface-elevated grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-4 sm:gap-2 sm:p-2.5">
          {QUICK_ACTIONS.map(({ to, label, description, icon: Icon, tint }) => (
            <Link
              key={to}
              to={to}
              className="group flex min-w-0 items-center gap-3 rounded-[1rem] p-2.5 transition-colors hover:bg-brand-50 sm:p-3"
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-[.9rem] shadow-[0_8px_18px_-14px_rgba(0,31,77,.7)] transition-transform group-hover:-translate-y-0.5 ${tint}`}>
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink-800 sm:text-sm">{label}</span>
                <span className="mt-0.5 hidden truncate text-[10px] text-ink-400 lg:block">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-6 pt-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.65fr)] lg:pt-9">
        <section aria-labelledby="recent-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-brand-600 uppercase">Hareket merkezi</p>
              <h2 id="recent-title" className="text-h2 text-brand-950">Son işlemler</h2>
            </div>
            <Link to="/customer/transactions" className="group inline-flex items-center gap-1.5 rounded-pill bg-white px-3.5 py-2 text-sm font-semibold text-brand-700 shadow-card">
              Tümünü gör <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>

          {transactions.isPending ? <SkeletonList rows={4} /> : null}
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
                  className="gradient-action inline-flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold text-brand-950 shadow-fab"
                >
                  <Plus className="size-4" /> İlk işlemi oluştur
                </Link>
              }
            />
          ) : null}

          <div className="space-y-3">
            {transactions.data?.items.map((item) => {
              const level = item.displayRiskLevel;
              const tone = riskTone(level);
              return (
                <Link
                  key={item.transactionId}
                  to="/customer/transactions/$transactionId"
                  params={{ transactionId: item.transactionId }}
                  className="group surface-card relative flex min-h-[5.5rem] items-center gap-3.5 overflow-hidden p-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-raised"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} aria-hidden />
                  <span className="ml-1 flex size-11 shrink-0 items-center justify-center rounded-tile bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-100">
                    <CreditCard className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{item.transactionNo}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {TRANSACTION_TYPE_LABEL[item.transactionType]} · {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="font-semibold tabular text-ink-900">{formatMoney(item.amount, item.currency)}</p>
                    <ToneBadge toneClass={tone.chip} className="px-2 py-0.5 text-micro">
                      {DISPLAY_RISK_LABEL[level]}
                    </ToneBadge>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4" aria-label="Güvenlik durumu">
          <section className="surface-elevated overflow-hidden p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-brand-600 uppercase">Güvenlik durumu</p>
                <h2 className="mt-1 text-lg font-bold text-brand-950">{secure ? 'Her şey yolunda' : 'Onayın gerekiyor'}</h2>
              </div>
              <span className={`flex size-11 items-center justify-center rounded-full ${secure ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                {secure ? <ShieldCheck className="size-5" /> : <ShieldAlert className="size-5" />}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              {secure
                ? 'Şüpheli bir hareket görünmüyor. Yeni bir kontrol gerektiğinde burada göreceksin.'
                : `${pendingCount} işlem güvenlik kontrolün için bekliyor.`}
            </p>
            <Link
              to="/customer/verifications"
              className="mt-5 flex items-center justify-between rounded-[1rem] bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              Doğrulama merkezine git <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>

          <section className="relative overflow-hidden rounded-[1.5rem] bg-brand-950 p-5 text-white shadow-raised sm:p-6">
            <div className="absolute -right-8 -bottom-12 size-40 rounded-full bg-aqua-500/16 blur-2xl" aria-hidden />
            <Activity className="size-5 text-aqua-300" aria-hidden />
            <h2 className="mt-4 text-lg font-bold">FraudCell aktif</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/62">
              İşlem sinyalleri gerçek zamanlı değerlendirilir ve kritik adımlar ayrıca doğrulanır.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
