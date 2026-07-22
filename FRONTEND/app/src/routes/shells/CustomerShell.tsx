import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { CreditCard, Home, Plus, ShieldCheck, User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { LogoMark, LogoWordmark } from '@/shared/ui/Logo';

/**
 * Müşteri kabuğu — mobil öncelikli, masaüstünde "vitrin".
 *
 * Mobilde tam ekran Paycell dili (gradient, tam pill nav, ortada FAB).
 * Masaüstünde uygulama, markalı atmosferik bir zemin üzerinde yükseltilmiş bir
 * cihaz yüzeyi içinde durur: geniş ekranda ince bir şerit gibi görünmek yerine
 * kasıtlı, premium bir vitrin hissi verir (jüri sunumu için).
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

export function CustomerShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-dvh">
      {/* Masaüstü atmosfer zemini — sabit, uygulamanın arkasında */}
      <div aria-hidden className="fixed inset-0 -z-10 hidden overflow-hidden gradient-splash lg:block">
        <div className="hero-mesh absolute inset-0" />
        {/* Sol üst marka; sağ altta dev soluk kalkan filigranı */}
        <div className="absolute top-8 left-10 xl:top-10 xl:left-14">
          <LogoWordmark tone="white" className="opacity-90" />
        </div>
        <LogoMark className="absolute -right-16 -bottom-16 size-[26rem] text-white opacity-[0.06]" />
        <p className="absolute bottom-10 left-10 max-w-xs text-sm text-white/55 xl:left-14">
          FraudCell · Paycell işlemleri için yapay zekâ destekli güvenlik.
        </p>
      </div>

      {/* Uygulama yüzeyi — mobilde tam ekran, masaüstünde yükseltilmiş cihaz */}
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full flex-col bg-canvas',
          'lg:my-8 lg:min-h-[calc(100dvh-4rem)] lg:max-w-[460px] lg:overflow-hidden',
          'lg:rounded-[2.25rem] lg:shadow-overlay lg:ring-1 lg:ring-black/5',
        )}
      >
        <main className="flex-1 pb-24 lg:pb-28">
          <Outlet />
        </main>
      </div>

      {/* Alt gezinme — mobilde tam genişlik bar, masaüstünde yüzen dock */}
      <nav
        aria-label="Ana gezinme"
        className={cn(
          'fixed z-40 border-ink-100 bg-surface/95 shadow-nav backdrop-blur-md safe-bottom',
          'inset-x-0 bottom-0 border-t',
          'lg:inset-x-auto lg:bottom-12 lg:left-1/2 lg:w-[404px] lg:-translate-x-1/2',
          'lg:rounded-full lg:border lg:shadow-raised',
        )}
      >
        <div className="relative mx-auto flex max-w-lg items-stretch lg:max-w-none">
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
