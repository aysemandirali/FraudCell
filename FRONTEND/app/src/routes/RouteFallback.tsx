import { LogoMark } from '@/components/brand/Logo';

/** Sayfa parçaları yüklenirken gösterilen marka ekranı. */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas"
      role="status"
      aria-label="Yükleniyor"
    >
      <LogoMark className="size-14 animate-pulse-ring text-brand-800" />
      <span className="text-sm text-ink-400">Yükleniyor…</span>
    </div>
  );
}
