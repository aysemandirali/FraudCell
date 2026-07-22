import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { CreditCard, Home, Plus, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Müşteri kabuğu — mobil öncelikli, alt navigasyonlu. Paycell mobil dilinin
 * devamı: ortada yükseltilmiş "Yeni işlem" aksiyonu, iki yanında ikişer sekme.
 *
 * Bildirimler alt barda değil ana sayfa kahramanındaki zil ikonundadır
 * (referans ekranlardaki düzen); alt bar dört ana yüzeyi + FAB'ı taşır.
 */

interface Tab {
  to: string;
  label: string;
  icon: typeof Home;
  exact: boolean;
}

const LEFT: Tab[] = [
  { to: '/customer', label: 'Ana Sayfa', icon: Home, exact: true },
  { to: '/customer/transactions', label: 'İşlemler', icon: CreditCard, exact: false },
];

const RIGHT: Tab[] = [
  { to: '/customer/verifications', label: 'Doğrulama', icon: ShieldCheck, exact: false },
  { to: '/customer/profile', label: 'Profil', icon: User, exact: false },
];

export function CustomerShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Ana gezinme"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 shadow-nav backdrop-blur-md safe-bottom"
      >
        <div className="relative mx-auto flex max-w-lg items-stretch">
          {LEFT.map((item) => (
            <NavTab key={item.to} item={item} pathname={pathname} />
          ))}

          {/* Ortadaki yükseltilmiş aksiyon */}
          <div className="flex w-16 shrink-0 justify-center">
            <Link
              to="/customer/transactions/new"
              aria-label="Yeni işlem"
              className="gradient-brand absolute -top-5 flex size-14 items-center justify-center rounded-full text-white shadow-fab transition-transform active:scale-95"
            >
              <Plus className="size-7" aria-hidden />
            </Link>
          </div>

          {RIGHT.map((item) => (
            <NavTab key={item.to} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavTab({ item, pathname }: { item: Tab; pathname: string }) {
  const { to, label, icon: Icon, exact } = item;
  const active = exact ? pathname === to : pathname.startsWith(to);
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 py-2.5 text-micro font-medium transition-colors',
        active ? 'text-brand-700' : 'text-ink-400 hover:text-ink-500',
      )}
    >
      <span className="relative">
        <Icon className="size-5" aria-hidden />
        {active && (
          <span
            className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brand-600"
            aria-hidden
          />
        )}
      </span>
      {label}
    </Link>
  );
}
