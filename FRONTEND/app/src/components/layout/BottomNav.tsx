import type { ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Sekme üzerinde okunmamış sayısı. */
  badge?: number;
}

export interface FabSpec {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Alt gezinme çubuğu — Paycell kalıbı: 5 sekme ve ortada yükseltilmiş
 * dairesel aksiyon butonu (tasarımda QR, burada "Para Gönder").
 */
export function BottomNav({ items, fab }: { items: NavItem[]; fab: FabSpec }) {
  const navigate = useNavigate();
  const FabIcon = fab.icon;

  // FAB ortada durur: sekmeler ikiye bölünür.
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  return (
    <nav
      aria-label="Ana gezinme"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white shadow-nav"
    >
      <div className="relative mx-auto flex h-16 max-w-3xl items-stretch">
        {left.map((item) => (
          <NavTab key={item.to} item={item} />
        ))}

        {/* FAB yuvası: çubuk üstünde beyaz oyuk + yükseltilmiş buton. */}
        <div className="relative w-20 shrink-0">
          <button
            type="button"
            onClick={() => navigate(fab.to)}
            aria-label={fab.label}
            className={cn(
              'absolute -top-5 left-1/2 -translate-x-1/2',
              'flex size-14 items-center justify-center rounded-full',
              'gradient-brand text-white shadow-fab',
              'ring-4 ring-white transition-transform duration-150',
              'hover:scale-105 active:scale-95',
            )}
          >
            <FabIcon className="size-6" />
          </button>
          <span className="absolute bottom-1.5 inset-x-0 text-center text-[11px] font-medium text-ink-500">
            {fab.label}
          </span>
        </div>

        {right.map((item) => (
          <NavTab key={item.to} item={item} />
        ))}
      </div>
    </nav>
  );
}

function NavTab({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      // Kök sekmeler yalnızca tam eşleşmede aktif olsun ("/" her yolu yakalamasın).
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 pt-1.5 pb-1',
          'text-[11px] font-medium transition-colors duration-150',
          isActive ? 'text-brand-700' : 'text-ink-500',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon className={cn('size-6', isActive && 'text-brand-700')} />
            {item.badge ? (
              <span
                className={cn(
                  'absolute -top-1 -right-2 min-w-4 rounded-full bg-danger-500 px-1',
                  'text-center text-[10px] leading-4 font-bold text-white tabular',
                )}
                aria-label={`${item.badge} okunmamış`}
              >
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : null}
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );
}
