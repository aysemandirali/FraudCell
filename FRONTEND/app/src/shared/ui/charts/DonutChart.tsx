import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/shared/lib/cn';
import { formatNumber } from '@/shared/lib/format';

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Donut grafik + yan gösterge.
 *
 * Merkezde toplam, sağda okunur bir liste. Renkler çağıran taraftan gelir
 * (risk paleti ya da kategori serisi) — grafik kendi renk sözlüğünü tutmaz.
 * Tümü sıfırsa boş halka gösterir, "NaN" üretmez.
 */
export function DonutChart({
  data,
  centerLabel = 'Toplam',
  className,
}: {
  data: DonutSlice[];
  centerLabel?: string;
  className?: string;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const hasData = total > 0;

  return (
    <div className={cn('flex h-full items-center gap-5', className)}>
      <div className="relative h-full w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ label: 'boş', value: 1, color: 'var(--color-ink-100)' }]}
              dataKey="value"
              nameKey="label"
              innerRadius="66%"
              outerRadius="100%"
              paddingAngle={hasData ? 2 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {(hasData ? data : [{ color: 'var(--color-ink-100)' }]).map((slice, index) => (
                <Cell key={index} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular text-ink-900">{formatNumber(total)}</span>
          <span className="text-caption text-ink-500">{centerLabel}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            <span className="min-w-0 flex-1 truncate text-ink-700">{slice.label}</span>
            <span className="shrink-0 font-semibold tabular text-ink-900">
              {formatNumber(slice.value)}
            </span>
            <span className="w-10 shrink-0 text-right text-caption tabular text-ink-400">
              {hasData ? `%${Math.round((slice.value / total) * 100)}` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
