/** Seviye eşikleri — doküman §10 (LVL-001..004). */
export type Level = 'BRONZ' | 'GUMUS' | 'ALTIN' | 'PLATIN';

interface LevelSpec {
  key: Level;
  label: string;
  min: number;
  /** Üst sınır dahil değildir; Platin'de sınır yoktur. */
  max: number | null;
  chip: string;
  ring: string;
}

export const LEVELS: LevelSpec[] = [
  {
    key: 'BRONZ',
    label: 'Bronz',
    min: 0,
    max: 500,
    chip: 'bg-[#f3e4d3] text-[#8a5a2b]',
    ring: 'stroke-[#b3763a]',
  },
  {
    key: 'GUMUS',
    label: 'Gümüş',
    min: 500,
    max: 1500,
    chip: 'bg-ink-100 text-ink-700',
    ring: 'stroke-ink-400',
  },
  {
    key: 'ALTIN',
    label: 'Altın',
    min: 1500,
    max: 3000,
    chip: 'bg-tc-100 text-[#b38c00]',
    ring: 'stroke-tc-500',
  },
  {
    key: 'PLATIN',
    label: 'Platin',
    min: 3000,
    max: null,
    chip: 'bg-aqua-100 text-aqua-700',
    ring: 'stroke-aqua-500',
  },
];

export function levelForPoints(points: number): LevelSpec {
  // Sondan başa tarayarak eşiği geçilen ilk seviyeyi buluruz.
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i]!.min) return LEVELS[i]!;
  }
  return LEVELS[0]!;
}

/** Bir sonraki seviyeye kalan puan ve ilerleme oranı. Platin'de ilerleme 1'dir. */
export function levelProgress(points: number): {
  level: LevelSpec;
  next: LevelSpec | null;
  ratio: number;
  remaining: number;
} {
  const level = levelForPoints(points);
  const index = LEVELS.findIndex((item) => item.key === level.key);
  const next = level.max === null ? null : (LEVELS[index + 1] ?? null);

  if (!next || level.max === null) {
    return { level, next: null, ratio: 1, remaining: 0 };
  }

  const span = level.max - level.min;
  const gained = points - level.min;
  return {
    level,
    next,
    ratio: Math.max(0, Math.min(1, gained / span)),
    remaining: Math.max(0, level.max - points),
  };
}
