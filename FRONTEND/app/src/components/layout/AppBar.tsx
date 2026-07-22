import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AppBarProps {
  title: string;
  /** Geri okunu gösterir. `to` verilmezse tarayıcı geçmişinde bir adım geri gider. */
  back?: boolean | string;
  actions?: ReactNode;
  /** Tasarımdaki açık mavi başlık ("Hediye Dünyası", "Profil"). */
  tinted?: boolean;
  className?: string;
}

/**
 * Ortalanmış başlıklı üst çubuk — Paycell'in iç sayfa standardı.
 * Solda geri oku, sağda aksiyon ikonları.
 */
export function AppBar({ title, back, actions, tinted = false, className }: AppBarProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'safe-top sticky top-0 z-30 border-b',
        tinted ? 'border-transparent bg-brand-100' : 'border-ink-100 bg-white',
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-2">
        {back ? (
          <button
            type="button"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            aria-label="Geri"
            className="rounded-full p-2 text-ink-700 transition-colors hover:bg-black/5"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : (
          <span className="w-2" aria-hidden />
        )}

        <h1 className="flex-1 truncate text-center text-[17px] font-semibold text-ink-900">
          {title}
        </h1>

        <div className="flex min-w-10 items-center justify-end gap-1 pr-1">{actions}</div>
      </div>
    </header>
  );
}

/** Sol hizalı büyük başlık — "Cüzdanım", "İşlemler", "Fırsatlar" sekme kökleri. */
export function LargeTitleBar({
  title,
  actions,
  className,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('safe-top sticky top-0 z-30 border-b border-ink-100 bg-white', className)}
    >
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-5">
        <h1 className="truncate text-2xl font-semibold text-ink-900">{title}</h1>
        <div className="flex shrink-0 items-center gap-3 text-ink-700">{actions}</div>
      </div>
    </header>
  );
}
