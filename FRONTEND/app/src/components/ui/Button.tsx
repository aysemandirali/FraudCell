import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onBrand';
type Size = 'sm' | 'md' | 'lg';

/**
 * Paycell butonları tam pill. Birincil CTA mavi→camgöbeği gradient,
 * ikincil beyaz zemin üzerinde mavi kenarlık.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'gradient-brand text-white shadow-raised hover:brightness-105 active:brightness-95',
  secondary:
    'bg-white text-brand-700 border border-brand-700 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  danger: 'bg-danger-500 text-white hover:bg-danger-700 active:brightness-95',
  // Gradient başlığın üzerinde duran buton — beyaz zemin, koyu mavi metin.
  onBrand: 'bg-white text-brand-800 shadow-raised hover:bg-brand-50 active:bg-brand-100',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5',
  md: 'h-12 px-6 text-[15px] gap-2',
  lg: 'h-14 px-8 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      // Yükleniyorken ekran okuyucuya durumu bildir.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-pill font-semibold',
        'transition-[filter,background-color,box-shadow] duration-150',
        // Devre dışı hâli tasarımda düz gri dolgu + gri metin.
        'disabled:pointer-events-none disabled:bg-none disabled:bg-ink-100',
        'disabled:text-ink-400 disabled:shadow-none disabled:border-transparent',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        leadingIcon && <span aria-hidden>{leadingIcon}</span>
      )}
      {children}
      {!loading && trailingIcon && <span aria-hidden>{trailingIcon}</span>}
    </button>
  );
});
