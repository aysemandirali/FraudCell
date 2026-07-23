import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Bell, CreditCard, Home, Plus, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { LogoWordmark } from '@/shared/ui/Logo';

/**
 * Müşteri kabuğu — mobil öncelikli, masaüstünde gerçek web çalışma alanı.
 *
 * Mobilde tam ekran Paycell dili (gradient, tam pill nav, ortada FAB).
 * Masaüstünde üst navigasyon ve geniş, merkezlenmiş içerik alanı kullanılır;
 * sayfalar mobil cihaz maketine sıkışmadan ekranı verimli biçimde doldurur.
 *
 * Bildirimler alt barda değil ana sayfa kahramanındaki zil ikonundadır; alt bar
 * dört ana yüzeyi + "Yeni işlem" FAB'ını taşır.
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

const DESKTOP_NAV = [...LEFT, ...RIGHT];

export function CustomerShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-dvh bg-canvas">
      {/* Masaüstü web kabuğu — içerik artık cihaz maketine sıkışmaz. */}
      <header className="sticky top-0 z-40 hidden border-b border-ink-100 bg-surface/90 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center gap-6 px-6 xl:px-8">
          <Link to="/customer" aria-label="Ana sayfa" className="shrink-0">
            <LogoWordmark />
          </Link>

          <nav aria-label="Müşteri gezinme" className="flex min-w-0 items-center gap-1">
            {DESKTOP_NAV.map((item) => (
              <DesktopNavTab key={item.to} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              to="/customer/notifications"
              aria-label="Bildirimler"
              className="flex size-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <Bell className="size-5" aria-hidden />
            </Link>
            <Link
              to="/customer/transactions/new"
              className="gradient-brand inline-flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-[filter,transform] hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="size-4" aria-hidden />
              Yeni işlem
            </Link>
          </div>
        </div>
      </header>

      <main className="min-h-dvh pb-24 lg:min-h-[calc(100dvh-4.5rem)] lg:pb-0">
        <Outlet />
      </main>

      {/* Alt gezinme yalnızca mobil uygulama yüzünde kalır. */}
      <nav
        aria-label="Ana gezinme"
        className={cn(
          'fixed z-40 border-ink-100 bg-surface/95 shadow-nav backdrop-blur-md safe-bottom',
          'inset-x-0 bottom-0 border-t',
          'lg:hidden',
        )}
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
              className="gradient-brand absolute -top-5 flex size-14 items-center justify-center rounded-full text-white shadow-fab transition-transform hover:brightness-105 active:scale-95"
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

function DesktopNavTab({ item, pathname }: { item: Tab; pathname: string }) {
  const { to, label, icon: Icon, exact } = item;
  const active = exact ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-ink-500 hover:bg-ink-100/70 hover:text-ink-900',
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Link>
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
