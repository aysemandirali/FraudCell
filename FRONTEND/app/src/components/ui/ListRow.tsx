import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Sağ tarafta chevron'dan önce duran içerik — rozet, tutar vs. */
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  /** Bağlantı/buton olsa bile chevron'u gizler. */
  hideChevron?: boolean;
  className?: string;
}

/**
 * Paycell'in temel liste satırı: yuvarlak ikon + başlık/alt başlık + chevron.
 * "Kıymetli Maden İşlemleri", "Limitlerim", "Sözleşmeler" hep bu kalıpta.
 */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  to,
  onClick,
  hideChevron = false,
  className,
}: ListRowProps) {
  const interactive = Boolean(to || onClick);

  const content = (
    <>
      {icon}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-medium text-ink-900">{title}</span>
        {subtitle && <span className="mt-0.5 block text-sm text-ink-500">{subtitle}</span>}
      </span>
      {trailing}
      {interactive && !hideChevron && (
        <ChevronRight className="size-5 shrink-0 text-ink-400" aria-hidden />
      )}
    </>
  );

  const classes = cn(
    'flex w-full items-center gap-3 px-4 py-3.5',
    interactive && 'transition-colors duration-150 hover:bg-brand-50 active:bg-brand-100',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

/** Satırları beyaz kart içinde ayırıcı çizgilerle gruplar. */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'surface-card overflow-hidden',
        // Ayırıcılar ikon hizasından başlar — tasarımdaki gibi girintili.
        '[&>*+*]:border-t [&>*+*]:border-ink-100',
        className,
      )}
    >
      {children}
    </div>
  );
}
