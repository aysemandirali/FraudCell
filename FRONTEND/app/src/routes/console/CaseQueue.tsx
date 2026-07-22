import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatRelative } from '@/lib/format';
import {
  Badge,
  ChipGroup,
  EmptyState,
  Field,
  RiskBar,
  SectionTitle,
  SkeletonList,
  SlaCountdown,
} from '@/components/ui';
import { useCases } from '@/hooks/queries';
import { useCurrentUser } from '@/stores/auth';
import { riskTone } from '@/domain/risk';
import { slaPriority, slaWindowMs } from '@/domain/sla';
import {
  CASE_STATUS_LABEL,
  FRAUD_TYPE_LABEL,
  TRANSACTION_TYPE_LABEL,
  type CaseStatus,
  type RiskCase,
} from '@/domain/types';
import type { CaseFilters } from '@/api/endpoints';

/** Durum filtresi çipleri. "ALL" backend'e gönderilmez. */
const STATUS_FILTERS: { value: CaseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tümü' },
  { value: 'ATANDI', label: 'Atandı' },
  { value: 'INCELENIYOR', label: 'İnceleniyor' },
  { value: 'MUSTERI_DOGRULAMA', label: 'Müşteri Doğrulama' },
  { value: 'YENI', label: 'Kuyrukta' },
  { value: 'ONAYLANDI', label: 'Onaylandı' },
  { value: 'BLOKLANDI', label: 'Bloklandı' },
  { value: 'KAPANDI', label: 'Kapandı' },
];

const SORT_OPTIONS: { value: NonNullable<CaseFilters['sort']>; label: string }[] = [
  { value: 'sla', label: 'SLA’ya göre' },
  { value: 'risk', label: 'Riske göre' },
  { value: 'createdAt', label: 'En yeni' },
];

const STATUS_TONE: Record<CaseStatus, 'brand' | 'warning' | 'success' | 'critical' | 'neutral'> = {
  YENI: 'neutral',
  ATANDI: 'brand',
  INCELENIYOR: 'warning',
  MUSTERI_DOGRULAMA: 'warning',
  ONAYLANDI: 'success',
  BLOKLANDI: 'critical',
  KAPANDI: 'neutral',
};

/**
 * Analist ve süpervizörün vaka kuyruğu.
 *
 * Analist yalnızca kendine atanmış vakaları görür (ROLE-003) — kapsam seçici
 * ona gösterilmez. Süpervizör tüm vakaları görebilir ve kendine atananlara
 * daralabilir (ROLE-004).
 */
export default function CaseQueue() {
  const user = useCurrentUser();
  const isAnalyst = user?.role === 'ANALYST';

  const [status, setStatus] = useState<CaseStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<NonNullable<CaseFilters['sort']>>('sla');
  const [scope, setScope] = useState<'me' | 'all'>(isAnalyst ? 'me' : 'all');
  const [search, setSearch] = useState('');

  const filters = useMemo<CaseFilters>(() => {
    const next: CaseFilters = { sort, pageSize: 50 };
    if (status !== 'ALL') next.status = status;
    // Analist için kapsam her zaman "me"; sunucu da bunu ayrıca zorlar.
    if (isAnalyst || scope === 'me') next.assignee = 'me';
    if (search.trim()) next.search = search.trim();
    return next;
  }, [status, sort, scope, search, isAnalyst]);

  const { data, isPending, isError, error } = useCases(filters);

  // Sunucu sıralamayı zaten yapar; SLA görünümünde aşılmış kritik vakaların
  // tepede kalmasını arayüzde de garantiye alırız (SLA-008).
  const cases = useMemo(() => {
    const items = data?.items ?? [];
    if (sort !== 'sla') return items;
    return [...items].sort(
      (a, b) =>
        slaPriority(a.riskLevel, a.slaDueAt, a.slaBreached) -
        slaPriority(b.riskLevel, b.slaDueAt, b.slaBreached),
    );
  }, [data?.items, sort]);

  const breachedCount = cases.filter((item) => item.slaBreached).length;

  return (
    <div className="space-y-5">
      <SectionTitle
        action={
          data && (
            <span className="text-sm text-ink-500 tabular">
              {data.totalItems} vaka
              {breachedCount > 0 && (
                <span className="ml-2 font-semibold text-critical-700">
                  {breachedCount} SLA aşımı
                </span>
              )}
            </span>
          )
        }
      >
        Vaka Kuyruğu
      </SectionTitle>

      {/* ------------------------------------------------------- Filtreler -- */}
      <div className="space-y-3">
        <Field
          label="Ara"
          placeholder="Vaka no, işlem no veya alıcı"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          leadingIcon={<Search className="size-5" />}
        />

        {!isAnalyst && (
          <ChipGroup
            items={[
              { value: 'all', label: 'Tüm vakalar' },
              { value: 'me', label: 'Bana atananlar' },
            ]}
            value={scope}
            onChange={setScope}
          />
        )}

        <ChipGroup items={STATUS_FILTERS} value={status} onChange={setStatus} />
        <ChipGroup items={SORT_OPTIONS} value={sort} onChange={setSort} />
      </div>

      {/* ----------------------------------------------------------- Liste -- */}
      {isPending ? (
        <SkeletonList rows={4} />
      ) : isError ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Vakalar yüklenemedi"
          description={error instanceof Error ? error.message : 'Lütfen tekrar dene.'}
        />
      ) : cases.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Bu filtrede vaka yok"
          description={
            isAnalyst
              ? 'Sana atanmış bekleyen bir vaka bulunmuyor.'
              : 'Seçtiğin filtrelerle eşleşen vaka bulunamadı.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item.id}>
              <CaseCard riskCase={item} showAssignee={!isAnalyst} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Vaka kartı -- */

function CaseCard({ riskCase, showAssignee }: { riskCase: RiskCase; showAssignee: boolean }) {
  const tone = riskTone(riskCase.riskLevel);
  const transaction = riskCase.transaction;

  return (
    <Link
      to={`/konsol/vaka/${riskCase.id}`}
      className={cn(
        'surface-card relative block overflow-hidden p-4 pl-5',
        'transition-shadow duration-150 hover:shadow-raised',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.rail)} aria-hidden />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-400">{riskCase.caseNo}</p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-ink-900">
            {formatCurrency(transaction.amount)} · {transaction.recipient}
          </p>
          <p className="mt-0.5 truncate text-sm text-ink-500">
            {TRANSACTION_TYPE_LABEL[transaction.transactionType]} · {transaction.city},{' '}
            {transaction.country}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={STATUS_TONE[riskCase.status]}>{CASE_STATUS_LABEL[riskCase.status]}</Badge>
          <SlaCountdown
            dueAt={riskCase.slaDueAt}
            totalMs={slaWindowMs(riskCase.riskLevel)}
            breached={riskCase.slaBreached}
            compact
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <RiskBar
          score={riskCase.riskScore}
          level={riskCase.riskLevel}
          status={transaction.assessmentStatus}
          className="min-w-[8rem] flex-1"
        />
        {riskCase.fraudType && riskCase.fraudType !== 'TEMIZ' && (
          <Badge tone="warning">{FRAUD_TYPE_LABEL[riskCase.fraudType]}</Badge>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-400">
        <span>{formatRelative(riskCase.createdAt)}</span>
        {showAssignee && (
          <span>
            {riskCase.assignedAnalystName ? (
              <>Atanan: <span className="text-ink-700">{riskCase.assignedAnalystName}</span></>
            ) : (
              <span className="font-semibold text-warning-700">Atanmadı · kuyrukta</span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}
