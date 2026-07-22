import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Cpu, Inbox, Timer, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  Badge,
  Banner,
  Card,
  CardHeader,
  EmptyState,
  SectionTitle,
  Skeleton,
  SlaCountdown,
} from '@/components/ui';
import { useAiMetrics, useAnalysts, useCases } from '@/hooks/queries';
import { RISK_LEVEL_LABEL, riskTone } from '@/domain/risk';
import { slaPriority, slaWindowMs } from '@/domain/sla';
import {
  CASE_STATUS_LABEL,
  FRAUD_TYPE_LABEL,
  type FraudType,
  type RiskCase,
  type RiskLevel,
} from '@/domain/types';

const RISK_LEVELS: RiskLevel[] = ['KRITIK', 'YUKSEK', 'ORTA', 'DUSUK'];

/** Kapalı sayılmayan, hâlâ operasyonda olan vaka durumları. */
const ACTIVE_STATUSES = new Set(['YENI', 'ATANDI', 'INCELENIYOR', 'MUSTERI_DOGRULAMA']);

/**
 * Süpervizör operasyon panosu (DSH-001..013).
 *
 * Ayrı bir Reporting Service veya BFF yoktur; ekran veriyi ilgili servislerden
 * paralel çeker ve yalnızca UI composition yapar (doküman §30). Bir metrik
 * servisi kapalıysa yalnızca o kart "kullanılamıyor" gösterir, pano çökmez.
 */
export default function Supervisor() {
  const { data: casePage, isPending: casesPending } = useCases({ pageSize: 200, sort: 'sla' });
  const aiMetrics = useAiMetrics();
  const { data: analysts } = useAnalysts();

  const cases = useMemo(() => casePage?.items ?? [], [casePage?.items]);

  const stats = useMemo(() => {
    const active = cases.filter((item) => ACTIVE_STATUSES.has(item.status));
    const breached = cases.filter((item) => item.slaBreached);
    const queued = cases.filter(
      (item) => item.assignmentStatus === 'QUEUED' || item.assignedAnalystId === null,
    );
    // Değerlendirmesi tamamlanmamış vakalar manuel kuyruğa düşer (DSH-011).
    const unknownRisk = cases.filter(
      (item) => item.transaction.assessmentStatus !== 'COMPLETED',
    );

    const withSla = cases.filter((item) => item.slaDueAt !== null);
    const compliance =
      withSla.length === 0 ? 1 : (withSla.length - breached.length) / withSla.length;

    return { active, breached, queued, unknownRisk, compliance };
  }, [cases]);

  const riskDistribution = useMemo(
    () =>
      RISK_LEVELS.map((level) => ({
        level,
        count: cases.filter((item) => item.riskLevel === level).length,
      })),
    [cases],
  );

  const fraudDistribution = useMemo(() => {
    const counts = new Map<FraudType, number>();
    for (const item of cases) {
      if (!item.fraudType) continue;
      counts.set(item.fraudType, (counts.get(item.fraudType) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([fraudType, count]) => ({ fraudType, count }))
      .sort((a, b) => b.count - a.count);
  }, [cases]);

  const breachedSorted = useMemo(
    () =>
      [...stats.breached].sort(
        (a, b) =>
          slaPriority(a.riskLevel, a.slaDueAt, a.slaBreached) -
          slaPriority(b.riskLevel, b.slaDueAt, b.slaBreached),
      ),
    [stats.breached],
  );

  if (casesPending) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle>Operasyon Panosu</SectionTitle>

      {/* --------------------------------------------------------- KPI'lar -- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Activity />}
          label="Aktif vaka"
          value={formatNumber(stats.active.length)}
          caption={`${cases.length} toplam vaka`}
        />
        <StatTile
          icon={<Timer />}
          label="SLA uyumu"
          value={`%${Math.round(stats.compliance * 100)}`}
          caption="süresi içinde çözülen"
          tone={stats.compliance < 0.9 ? 'warning' : 'success'}
        />
        <StatTile
          icon={<AlertTriangle />}
          label="SLA aşımı"
          value={formatNumber(stats.breached.length)}
          caption="acil müdahale"
          tone={stats.breached.length > 0 ? 'critical' : 'success'}
        />
        <StatTile
          icon={<Inbox />}
          label="Atama kuyruğu"
          value={formatNumber(stats.queued.length)}
          caption={`${stats.unknownRisk.length} belirsiz risk`}
          tone={stats.queued.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* --------------------------------------------------- SLA aşımları -- */}
      {breachedSorted.length > 0 && (
        <Card>
          <CardHeader
            title="SLA Aşmış Aktif Vakalar"
            subtitle="En kritik olan en üstte — hemen müdahale gerekir"
          />
          <ul className="mt-4 space-y-2">
            {breachedSorted.slice(0, 8).map((item) => (
              <li key={item.id}>
                <BreachedRow riskCase={item} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ------------------------------------------------------- Dağılımlar -- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Risk Seviyesi Dağılımı" subtitle={`${cases.length} vaka`} />
          <div className="mt-4 space-y-3">
            {riskDistribution.map((row) => (
              <BarRow
                key={row.level}
                label={RISK_LEVEL_LABEL[row.level]}
                value={row.count}
                total={cases.length}
                barClass={riskTone(row.level).bar}
              />
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Fraud Türü Dağılımı" subtitle="Vaka sayısına göre" />
          {fraudDistribution.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">Henüz sınıflandırılmış vaka yok.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {fraudDistribution.map((row) => (
                <BarRow
                  key={row.fraudType}
                  label={FRAUD_TYPE_LABEL[row.fraudType]}
                  value={row.count}
                  total={cases.length}
                  // Büyüklük tek hue ile gösterilir; kimlik satır etiketinden gelir.
                  barClass="bg-brand-500"
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------ AI metrikleri -- */}
      <Card>
        <CardHeader
          title="AI Model Performansı"
          subtitle={aiMetrics.data ? `Model ${aiMetrics.data.modelVersion}` : undefined}
          action={<Cpu className="size-5 text-ink-400" />}
        />

        {aiMetrics.isPending ? (
          <Skeleton className="mt-4 h-24 w-full" />
        ) : aiMetrics.isError || !aiMetrics.data ? (
          <Banner tone="warning" className="mt-4">
            AI Service şu anda yanıt vermiyor, model metrikleri geçici olarak gösterilemiyor.
            Panonun geri kalanı çalışmaya devam eder.
          </Banner>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricTile
                label="Genel doğruluk"
                value={aiMetrics.data.overallAccuracy}
                caption="fraud türü override edilmedi"
              />
              <MetricTile
                label="Karar isabeti"
                value={aiMetrics.data.decisionAgreement}
                caption="analistle uyuşan karar"
              />
              <MetricTile
                label="Yanlış pozitif"
                value={aiMetrics.data.falsePositiveRate}
                caption="AI blokladı, analist onayladı"
                invert
              />
            </div>

            {aiMetrics.data.byFraudType.length > 0 && (
              <div className="mt-5 border-t border-ink-100 pt-4">
                <p className="mb-3 text-sm font-medium text-ink-700">
                  Kategori bazlı doğruluk
                </p>
                <div className="space-y-3">
                  {aiMetrics.data.byFraudType.map((row) => (
                    <BarRow
                      key={row.fraudType}
                      label={FRAUD_TYPE_LABEL[row.fraudType]}
                      value={Math.round(row.accuracy * 100)}
                      total={100}
                      unit="%"
                      caption={`${row.sampleSize} örnek`}
                      barClass="bg-aqua-500"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ---------------------------------------------------- Atama kuyruğu -- */}
      <Card>
        <CardHeader
          title="Atama Bekleyen Vakalar"
          subtitle="Kapasite dolduğu veya değerlendirme tamamlanmadığı için bekliyor"
        />
        {stats.queued.length === 0 ? (
          <EmptyState icon={<Inbox />} title="Kuyruk boş" description="Tüm vakalar atanmış." />
        ) : (
          <ul className="mt-4 space-y-2">
            {stats.queued.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-ink-100 bg-canvas px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ink-400">{item.caseNo}</p>
                  <p className="truncate text-sm font-medium text-ink-900">
                    {formatCurrency(item.transaction.amount)} · {item.transaction.recipient}
                  </p>
                </div>
                <Link
                  to={`/konsol/vaka/${item.id}`}
                  className="shrink-0 rounded-pill border border-brand-700 px-3.5 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50"
                >
                  Manuel Ata
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ------------------------------------------------ Analist performansı -- */}
      {analysts && analysts.length > 0 && (
        <Card flush>
          <div className="p-4">
            <CardHeader title="Analist Performansı" subtitle={`${analysts.length} personel`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-y border-ink-100 bg-canvas text-left text-xs text-ink-500">
                  <th scope="col" className="px-4 py-2.5 font-medium">Analist</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Uzmanlık</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Aktif vaka</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Doğruluk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {analysts.map((analyst) => (
                  <tr key={analyst.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{analyst.fullName}</p>
                      <p className="text-xs text-ink-400">{analyst.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {analyst.specialties.map((specialty) => (
                          <Badge key={specialty} tone="neutral">
                            {FRAUD_TYPE_LABEL[specialty]}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      <span className={cn(analyst.activeCases >= 10 && 'font-semibold text-danger-700')}>
                        {analyst.activeCases}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular">
                      %{Math.round(analyst.accuracy * 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Parçacıklar -- */

type Tone = 'brand' | 'success' | 'warning' | 'critical' | 'neutral';

const TILE_TONE: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  critical: 'bg-critical-100 text-critical-700',
  neutral: 'bg-ink-100 text-ink-500',
};

function StatTile({
  icon,
  label,
  value,
  caption,
  tone = 'brand',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  tone?: Tone;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-tile [&>svg]:size-5',
            TILE_TONE[tone],
          )}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-ink-500">{label}</p>
          {/* Sayı metin token'ıyla yazılır; renk yalnızca yanındaki ikonda. */}
          <p className="text-2xl font-bold text-ink-900 tabular">{value}</p>
          <p className="text-xs text-ink-400">{caption}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Etiketli yatay bar.
 *
 * Kimlik satır etiketinden gelir, renkten değil — bu yüzden yığılmış bar veya
 * pasta yerine ayrı satırlar kullanılır. Değer her zaman metin olarak da
 * yazılır; renk körlüğü, düşük kontrast ve yazdırma durumlarında bilgi kaybolmaz.
 */
function BarRow({
  label,
  value,
  total,
  barClass,
  unit = '',
  caption,
}: {
  label: string;
  value: number;
  total: number;
  barClass: string;
  unit?: string;
  caption?: string;
}) {
  const ratio = total === 0 ? 0 : value / total;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="truncate text-sm text-ink-700">{label}</span>
        <span className="shrink-0 text-sm font-semibold text-ink-900 tabular">
          {value}
          {unit}
          {caption && <span className="ml-2 font-normal text-ink-400">{caption}</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', barClass)}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  caption,
  invert = false,
}: {
  label: string;
  value: number;
  caption: string;
  /** Yanlış pozitif gibi "düşük olması iyi" metrikler için renk yönünü ters çevirir. */
  invert?: boolean;
}) {
  const good = invert ? value <= 0.1 : value >= 0.85;

  return (
    <div className="rounded-tile border border-ink-100 bg-canvas p-3.5">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-0.5 flex items-center gap-2 text-2xl font-bold text-ink-900 tabular">
        %{Math.round(value * 100)}
        <TrendingUp
          className={cn(
            'size-4',
            good ? 'text-success-500' : 'text-warning-500',
            invert && 'rotate-180',
          )}
          aria-hidden
        />
      </p>
      <p className="text-xs text-ink-400">{caption}</p>
    </div>
  );
}

function BreachedRow({ riskCase }: { riskCase: RiskCase }) {
  return (
    <Link
      to={`/konsol/vaka/${riskCase.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-critical-500/25 bg-critical-100/50 px-3.5 py-3 transition-colors hover:bg-critical-100"
    >
      <div className="min-w-0">
        <p className="font-mono text-xs text-ink-500">{riskCase.caseNo}</p>
        <p className="truncate text-sm font-medium text-ink-900">
          {formatCurrency(riskCase.transaction.amount)} · {riskCase.transaction.recipient}
        </p>
        <p className="text-xs text-ink-500">
          {CASE_STATUS_LABEL[riskCase.status]}
          {riskCase.assignedAnalystName ? ` · ${riskCase.assignedAnalystName}` : ' · atanmadı'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {riskCase.riskLevel && (
          <Badge tone="critical">{RISK_LEVEL_LABEL[riskCase.riskLevel]}</Badge>
        )}
        <SlaCountdown
          dueAt={riskCase.slaDueAt}
          totalMs={slaWindowMs(riskCase.riskLevel)}
          breached
          compact
        />
      </div>
    </Link>
  );
}
