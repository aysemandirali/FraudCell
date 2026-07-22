import type { RiskLevel } from './types';

/**
 * SLA pencereleri — doküman §8 (SLA-001..004).
 * SLA vaka oluşturulduğunda başlar, karar verildiğinde durur.
 *
 * Otorite Transaction Service'tir; buradaki değerler yalnızca arayüzün
 * geri sayımı doğru oranda göstermesi (kritik eşik hesabı) içindir.
 */
export const SLA_WINDOW_MS: Record<RiskLevel, number> = {
  KRITIK: 15 * 60 * 1000,
  YUKSEK: 60 * 60 * 1000,
  ORTA: 4 * 60 * 60 * 1000,
  DUSUK: 24 * 60 * 60 * 1000,
};

export const SLA_WINDOW_LABEL: Record<RiskLevel, string> = {
  KRITIK: '15 dakika',
  YUKSEK: '1 saat',
  ORTA: '4 saat',
  DUSUK: '24 saat',
};

/** Risk seviyesi bilinmiyorsa en dar pencereyi varsayarız — uyarı geç kalmasın. */
export function slaWindowMs(level: RiskLevel | null | undefined): number {
  return SLA_WINDOW_MS[level ?? 'KRITIK'];
}

/**
 * Süpervizör panelinde sıralama önceliği: aşılmış KRITIK vakalar en üstte
 * (SLA-008). Küçük değer daha yukarıda görünür.
 */
export function slaPriority(
  level: RiskLevel | null | undefined,
  dueAt: string | null,
  breached: boolean,
  now: number = Date.now(),
): number {
  const overdue = breached || (dueAt !== null && new Date(dueAt).getTime() <= now);
  const levelRank: Record<RiskLevel, number> = { KRITIK: 0, YUKSEK: 1, ORTA: 2, DUSUK: 3 };
  const rank = levelRank[level ?? 'DUSUK'];

  // Aşılmışlar bloğu (0-3), sonra aşılmamışlar bloğu (10-13).
  return overdue ? rank : 10 + rank;
}
