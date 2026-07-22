import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ScanSearch, ShieldAlert, UserRoundCog } from 'lucide-react';
import {
  assignCase,
  getCase,
  overrideCaseFraudType,
  overrideCaseRisk,
  reassignCase,
} from '@/features/cases/api';
import { listStaff } from '@/features/staff/api';
import { useHasRole } from '@/features/authentication/useSession';
import type { FraudType, RiskLevel } from '@/shared/api/enums';
import {
  ASSIGNMENT_STATUS_LABEL,
  CASE_STATUS_LABEL,
  FRAUD_TYPES,
  FRAUD_TYPE_LABEL,
  RISK_LEVELS,
  RISK_LEVEL_LABEL,
  TRANSACTION_TYPE_LABEL,
} from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime, formatMoney, fullName } from '@/shared/lib/format';
import { riskTone } from '@/shared/lib/risk';
import {
  Button,
  ErrorState,
  RiskGauge,
  Sheet,
  SkeletonList,
  SlaCountdown,
  TextAreaField,
  ToneBadge,
  useToast,
} from '@/shared/ui';

type ActionPanel = 'assignment' | 'risk' | 'fraud' | null;

export function SupervisorCaseDetailPage({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const canManage = useHasRole('SUPERVISOR');
  const [panel, setPanel] = useState<ActionPanel>(null);
  const [analystId, setAnalystId] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel | ''>('');
  const [fraudType, setFraudType] = useState<FraudType | ''>('');
  const [reason, setReason] = useState('');

  const caseQuery = useQuery({
    queryKey: queryKeys.cases.detail(caseId),
    queryFn: () => getCase(caseId),
  });
  const staff = useQuery({
    queryKey: queryKeys.staff.list,
    queryFn: () => listStaff(100),
  });
  const riskCase = caseQuery.data?.data;
  const version = caseQuery.data?.etag ?? riskCase?.version;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(caseId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all }),
    ]);
  };
  const completed = async (message: string) => {
    setPanel(null);
    setReason('');
    await refresh();
    toast.success(message);
  };

  const assignment = useMutation({
    mutationFn: async () => {
      if (!riskCase || version === undefined || !analystId || !reason.trim()) return;
      if (riskCase.assignedAnalystId) {
        await reassignCase(caseId, version, { newAnalystId: analystId, reason: reason.trim() });
      } else {
        await assignCase(caseId, version, { analystId, reason: reason.trim() });
      }
    },
    onSuccess: () => void completed(riskCase?.assignedAnalystId ? 'Vaka yeniden atandı' : 'Vaka atandı'),
    onError: (error) => toast.fromError(error),
  });
  const riskOverride = useMutation({
    mutationFn: async () => {
      if (version === undefined || !riskLevel || !reason.trim()) return;
      await overrideCaseRisk(caseId, version, { riskLevel, reason: reason.trim() });
    },
    onSuccess: () => void completed('Risk seviyesi güncellendi'),
    onError: (error) => toast.fromError(error),
  });
  const fraudOverride = useMutation({
    mutationFn: async () => {
      if (version === undefined || !fraudType || !reason.trim()) return;
      await overrideCaseFraudType(caseId, version, { fraudType, reason: reason.trim() });
    },
    onSuccess: () => void completed('Risk tipi güncellendi'),
    onError: (error) => toast.fromError(error),
  });

  const analysts = (staff.data?.items ?? []).filter(
    (person) => person.role === 'ANALYST' && person.isActive && person.assignmentEnabled,
  );
  const assignedAnalyst = (staff.data?.items ?? []).find(
    (person) => person.id === riskCase?.assignedAnalystId,
  );

  const openPanel = (next: Exclude<ActionPanel, null>) => {
    setReason('');
    setAnalystId('');
    setRiskLevel('');
    setFraudType('');
    setPanel(next);
  };

  if (caseQuery.isPending) return <SkeletonList rows={4} />;
  if (caseQuery.isError || !riskCase)
    return <ErrorState error={caseQuery.error} onRetry={() => void caseQuery.refetch()} />;

  const tone = riskTone(riskCase.effectiveRisk.riskLevel);
  const activeMutation = assignment.isPending || riskOverride.isPending || fraudOverride.isPending;

  return (
    <div>
      <Link
        to="/supervisor/cases"
        search={{}}
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Vakalara dön
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h1 text-ink-900">{riskCase.transaction.transactionNo}</h1>
            <ToneBadge toneClass={tone.chip}>
              {riskCase.effectiveRisk.riskLevel
                ? RISK_LEVEL_LABEL[riskCase.effectiveRisk.riskLevel]
                : 'Belirsiz'}
            </ToneBadge>
            <ToneBadge toneClass="bg-ink-100 text-ink-700">
              {CASE_STATUS_LABEL[riskCase.status]}
            </ToneBadge>
          </div>
          <p className="mt-1 text-caption text-ink-500">Vaka #{riskCase.caseId.slice(0, 8)}</p>
        </div>
        <SlaCountdown sla={riskCase.sla} />
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="space-y-4">
          <article className="surface-panel p-5">
            <h2 className="text-h3 text-ink-900">İşlem</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-ink-400">Tutar</dt><dd className="mt-1 text-xl font-bold tabular text-ink-900">{formatMoney(riskCase.transaction.amount, riskCase.transaction.currency)}</dd></div>
              <div><dt className="text-xs text-ink-400">Tür</dt><dd className="mt-1 font-semibold text-ink-800">{TRANSACTION_TYPE_LABEL[riskCase.transaction.transactionType]}</dd></div>
              <div><dt className="text-xs text-ink-400">Alıcı</dt><dd className="mt-1 break-words text-sm text-ink-700">{riskCase.transaction.recipientReference}</dd></div>
              <div><dt className="text-xs text-ink-400">Konum</dt><dd className="mt-1 text-sm text-ink-700">{riskCase.transaction.city}, {riskCase.transaction.countryCode}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-ink-400">Zaman</dt><dd className="mt-1 text-sm text-ink-700">{formatDateTime(riskCase.transaction.occurredAt)}</dd></div>
            </dl>
          </article>

          <article className="surface-panel p-5">
            <h2 className="text-h3 text-ink-900">Atama</h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-ink-800">
                  {assignedAnalyst ? fullName(assignedAnalyst.firstName, assignedAnalyst.lastName) : riskCase.assignedAnalystId ?? 'Henüz atanmadı'}
                </p>
                <p className="mt-1 text-sm text-ink-500">{ASSIGNMENT_STATUS_LABEL[riskCase.assignmentStatus]}</p>
              </div>
              {canManage ? <Button size="sm" variant="secondary" leadingIcon={<UserRoundCog className="size-4" />} onClick={() => openPanel('assignment')}>{riskCase.assignedAnalystId ? 'Yeniden ata' : 'Analist ata'}</Button> : null}
            </div>
          </article>
        </section>

        <aside className="space-y-4">
          <article className="surface-panel p-5">
            <h2 className="text-h3 text-ink-900">Risk değerlendirmesi</h2>
            <div className="mt-4 flex justify-center"><RiskGauge score={riskCase.effectiveRisk.riskScore} level={riskCase.effectiveRisk.riskLevel ?? 'BELIRSIZ'} /></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Risk tipi</dt><dd className="text-right font-semibold text-ink-800">{riskCase.effectiveRisk.fraudType ? FRAUD_TYPE_LABEL[riskCase.effectiveRisk.fraudType] : 'Belirsiz'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-500">Override</dt><dd className="font-semibold text-ink-800">{riskCase.effectiveRisk.overridden ? 'Evet' : 'Hayır'}</dd></div>
            </dl>
          </article>

          {canManage ? (
            <article className="surface-panel p-5">
              <h2 className="text-h3 text-ink-900">Süpervizör işlemleri</h2>
              <div className="mt-4 grid gap-2">
                <Button variant="secondary" leadingIcon={<ShieldAlert className="size-4" />} onClick={() => openPanel('risk')}>Risk seviyesini değiştir</Button>
                <Button variant="secondary" leadingIcon={<ScanSearch className="size-4" />} onClick={() => openPanel('fraud')}>Risk tipini değiştir</Button>
              </div>
            </article>
          ) : null}
        </aside>
      </div>

      <Sheet
        open={panel !== null}
        onOpenChange={(open) => { if (!open && !activeMutation) setPanel(null); }}
        title={panel === 'assignment' ? 'Vaka ataması' : panel === 'risk' ? 'Risk seviyesi' : 'Risk tipi'}
        footer={
          <Button
            loading={activeMutation}
            disabled={!reason.trim() || (panel === 'assignment' ? !analystId : panel === 'risk' ? !riskLevel : !fraudType)}
            onClick={() => {
              if (panel === 'assignment') assignment.mutate();
              if (panel === 'risk') riskOverride.mutate();
              if (panel === 'fraud') fraudOverride.mutate();
            }}
          >
            Kaydet
          </Button>
        }
      >
        {panel === 'assignment' ? (
          <label className="block text-sm font-semibold text-ink-700">Analist
            <select aria-label="Analist" value={analystId} onChange={(event) => setAnalystId(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-ink-200 bg-surface px-3 font-normal">
              <option value="">Analist seç</option>
              {analysts.filter((person) => person.id !== riskCase.assignedAnalystId).map((person) => <option key={person.id} value={person.id}>{fullName(person.firstName, person.lastName)} · {person.email}</option>)}
            </select>
          </label>
        ) : null}
        {panel === 'risk' ? (
          <label className="block text-sm font-semibold text-ink-700">Yeni risk seviyesi
            <select aria-label="Yeni risk seviyesi" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as RiskLevel)} className="mt-2 h-11 w-full rounded-md border border-ink-200 bg-surface px-3 font-normal">
              <option value="">Seviye seç</option>
              {RISK_LEVELS.filter((value) => value !== riskCase.effectiveRisk.riskLevel).map((value) => <option key={value} value={value}>{RISK_LEVEL_LABEL[value]}</option>)}
            </select>
          </label>
        ) : null}
        {panel === 'fraud' ? (
          <label className="block text-sm font-semibold text-ink-700">Yeni risk tipi
            <select aria-label="Yeni risk tipi" value={fraudType} onChange={(event) => setFraudType(event.target.value as FraudType)} className="mt-2 h-11 w-full rounded-md border border-ink-200 bg-surface px-3 font-normal">
              <option value="">Tip seç</option>
              {FRAUD_TYPES.filter((value) => value !== riskCase.effectiveRisk.fraudType).map((value) => <option key={value} value={value}>{FRAUD_TYPE_LABEL[value]}</option>)}
            </select>
          </label>
        ) : null}
        <TextAreaField className="mt-4" label="Gerekçe" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
      </Sheet>
    </div>
  );
}
