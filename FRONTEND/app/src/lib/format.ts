/** Türkçe biçimlendirme yardımcıları — tüm ekranlarda tek kaynak. */

const tl = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
});

const plain = new Intl.NumberFormat('tr-TR');

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateOnly = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const timeOnly = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
});

/** 1400 -> "₺1.400,00" */
export function formatCurrency(amount: number): string {
  return tl.format(amount);
}

/** 12345 -> "12.345" */
export function formatNumber(value: number): string {
  return plain.format(value);
}

/** 0.94 -> "%94" — risk skorunu jüriye okunur biçimde gösterir. */
export function formatRiskPercent(score: number | null | undefined): string {
  if (score === null || score === undefined) return '—';
  return `%${Math.round(score * 100)}`;
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateOnly.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeOnly.format(new Date(iso));
}

/** "5XX XXX XX XX" maskesi — yalnızca rakamları alır, en fazla 10 hane. */
export function formatMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)];
  return parts.filter(Boolean).join(' ');
}

/** "5551234567" -> "555 *** ** 67" — OTP ekranında numarayı maskeler. */
export function maskMsisdn(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length < 10) return formatMsisdn(d);
  return `${d.slice(0, 3)} *** ** ${d.slice(8, 10)}`;
}

/**
 * Kalan süreyi "12:34" (dk:sn) ya da "1s 12dk" biçiminde verir.
 * SLA geri sayımı ve OTP sayacı bunu kullanır.
 */
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}s ${String(minutes).padStart(2, '0')}dk`;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "3 dakika önce" gibi göreli zaman — bildirim ve aktivite akışlarında. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return `${diffDay} gün önce`;

  return formatDate(iso);
}

/** "Ayşe Yılmaz" -> "AY" — avatar baş harfleri. */
export function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}
