import { useEffect, useState } from 'react';
import { Timer, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCountdown } from '@/lib/format';

/** SLA'nın son %25'ine girildiğinde kritik uyarı verilir. */
const CRITICAL_RATIO = 0.25;

export interface SlaCountdownProps {
  /** ISO tarih. null ise bu vakada SLA takibi yok. */
  dueAt: string | null;
  /** SLA'nın toplam süresi (ms). Kritik eşiği bundan hesaplanır. */
  totalMs?: number;
  breached?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * SLA geri sayımı. KRITIK vakalarda 15 dakikalık pencere işler (doküman §9).
 * Süre dolduğunda "SLA aşıldı" durumuna geçer.
 */
export function SlaCountdown({
  dueAt,
  totalMs = 15 * 60 * 1000,
  breached = false,
  compact = false,
  className,
}: SlaCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!dueAt || breached) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dueAt, breached]);

  if (!dueAt) {
    return compact ? null : <span className={cn('text-sm text-ink-400', className)}>SLA yok</span>;
  }

  const remaining = new Date(dueAt).getTime() - now;
  const isBreached = breached || remaining <= 0;
  const isCritical = !isBreached && remaining <= totalMs * CRITICAL_RATIO;

  const tone = isBreached
    ? 'bg-critical-100 text-critical-700'
    : isCritical
      ? 'bg-danger-100 text-danger-700'
      : 'bg-success-100 text-success-700';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1',
        'text-xs font-semibold tabular whitespace-nowrap',
        tone,
        className,
      )}
      // Kritik eşiğe girince ekran okuyucu kesintiye uğrayarak duyurur.
      role={isCritical || isBreached ? 'alert' : undefined}
    >
      {isBreached ? (
        <TriangleAlert className="size-3.5" aria-hidden />
      ) : (
        <Timer className={cn('size-3.5', isCritical && 'animate-pulse-ring')} aria-hidden />
      )}
      {isBreached ? 'SLA aşıldı' : formatCountdown(remaining)}
      {!compact && !isBreached && <span className="font-normal opacity-75">kaldı</span>}
    </span>
  );
}
