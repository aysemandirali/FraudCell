import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Alt köşede sabitlenen aksiyon alanı. */
  footer?: ReactNode;
  /** Masaüstünde ortalanmış diyalog, mobilde alttan açılan panel. */
  className?: string;
}

/**
 * Alttan açılan panel (mobil) / ortalanmış diyalog (masaüstü).
 * Tasarımdaki "Harcamalarının Kontrolü Sende" kartı bu kalıpta.
 */
export function Sheet({ open, onClose, title, description, children, footer, className }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    // Panel açıkken arkadaki sayfa kaymasın.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink-900/45"
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col animate-slide-up bg-white',
          'rounded-t-sheet sm:max-w-lg sm:rounded-sheet',
          'shadow-raised outline-none',
          className,
        )}
      >
        {/* Mobilde sürükleme tutamağı — tasarımdaki gri çubuk. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        {title && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
              {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="-mr-1 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="safe-bottom border-t border-ink-100 px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
