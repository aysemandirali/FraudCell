import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber } from '@/shared/lib/format';

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Alan (area) trend grafiği — zaman serisi. Marka mavisi gradient dolgu.
 *
 * Tek seri; birden çok seri gerektiğinde ayrı bir bileşen yazılır (YAGNI).
 * Eksen ve grid renkleri token'lardan gelir.
 */
export function TrendChart({
  data,
  color = 'var(--color-brand-600)',
  valueSuffix = '',
}: {
  data: TrendPoint[];
  color?: string;
  valueSuffix?: string;
}) {
  const gradientId = `trend-${valueSuffix || 'v'}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--color-ink-400)', fontSize: 12 }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: 'var(--color-ink-400)', fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: 'var(--color-ink-200)' }}
          formatter={(value) => [`${formatNumber(Number(value))}${valueSuffix}`, '']}
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: 'var(--shadow-overlay)',
            fontSize: 13,
          }}
          labelStyle={{ color: 'var(--color-ink-500)', fontWeight: 600 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
