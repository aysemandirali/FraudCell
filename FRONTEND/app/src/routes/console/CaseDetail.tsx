import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Clock,
  MessageSquare,
  ShieldQuestion,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { ApiError } from '@/api/client';
import { formatCurrency, formatDateTime, formatRelative, initials } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  RiskGauge,
  Sheet,
  SkeletonList,
  SlaCountdown,
  useToast,
} from '@/components/ui';
import { AiExplanation } from '@/components/domain/AiExplanation';
import { useAssessment, useAssignmentCandidates, useCase, useCaseActions } from '@/hooks/queries';
import { useCurrentUser } from '@/stores/auth';
import { availableActions } from '@/domain/stateMachine';
import { slaWindowMs } from '@/domain/sla';
import { RISK_LEVEL_LABEL } from '@/domain/risk';
import {
  CASE_STATUS_LABEL,
  FRAUD_TYPE_LABEL,
  TRANSACTION_TYPE_LABEL,
  type CaseStatus,
  type FraudType,
} from '@/domain/types';

type SheetKind = 'verification' | 'approve' | 'block' | 'override' | 'assign' | null;

const STATUS_TONE: Record<CaseStatus, 'brand' | 'warning' | 'success' | 'critical' | 'neutral'> = {
  YENI: 'neutral',
  ATANDI: 'brand',
  INCELENIYOR: 'warning',
  MUSTERI_DOGRULAMA: 'warning',
  ONAYLANDI: 'success',
  BLOKLANDI: 'critical',
  KAPANDI: 'neutral',
};

const FRAUD_TYPES: FraudType[] = [
  'CALINTI_KART',
  'HESAP_ELE_GECIRME',
  'PARA_AKLAMA',
  'SUPHELI_DAVRANIS',
  'TEMIZ',
];

/**
 * Vaka inceleme ekranı.
 *
 * Aksiyonlar state machine'e göre filtrelenir (doküman §10) — ekranda yalnızca
 * mevcut durumdan yapılabilecek geçişler görünür. Bu bir kolaylıktır, yetki
 * otoritesi değildir: sunucu aynı kuralı ownership ve version ile tekrar uygular.
 */
export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const toast = useToast();

  const { data: riskCase, isPending, isError, refetch } = useCase(id);
  const actions = useCaseActions(id);
  const [sheet, setSheet] = useState<SheetKind>(null);

  const assessmentReady = riskCase?.transaction.assessmentStatus === 'COMPLETED';
  const { data: assessment } = useAssessment(riskCase?.transactionId, Boolean(assessmentReady));

  if (isPending) return <SkeletonList rows={4} />;

  if (isError || !riskCase) {
    // Ownership ihlalinde sunucu 404 döner (doküman §7) — kaynağın varlığını sızdırmayız.
    return (
      <EmptyState
        icon={<CircleSlash />}
        title="Vaka bulunamadı"
        description="Vaka silinmiş olabilir ya da bu vakaya erişim yetkin yok."
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            Tekrar dene
          </Button>
        }
      />
    );
  }

  const isAssignedToMe = riskCase.assignedAnalystId === user?.id;
  const allowed = user ? availableActions(riskCase.status, user.role, { isAssignedToMe }) : [];
  const can = (kind: string) => allowed.some((action) => action.kind === kind);

  /** Aksiyon hatalarını tek yerde yorumla — 409 kullanıcıya yenileme dedirtir. */
  function handleError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.isConflict) {
        toast.error(
          'Vaka bu sırada değişti',
          'Başka bir kullanıcı işlem yapmış. En güncel hâli yüklendi.',
        );
        void refetch();
        return;
      }
      toast.error(error.isDomainViolation ? 'İşlem yapılamadı' : 'Hata', error.message);
      return;
    }
    toast.error('Beklenmeyen bir hata oluştu.');
  }

  async function run(operation: () => Promise<unknown>, successMessage: string) {
    try {
      await operation();
      toast.success(successMessage);
      setSheet(null);
    } catch (error) {
      handleError(error);
    }
  }

  const transaction = riskCase.transaction;

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------- Başlık -- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/konsol"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="size-4" />
            Vaka kuyruğu
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">{riskCase.caseNo}</h1>
          <p className="mt-0.5 font-mono text-xs text-ink-400">{transaction.transactionNo}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Badge tone={STATUS_TONE[riskCase.status]}>{CASE_STATUS_LABEL[riskCase.status]}</Badge>
          <SlaCountdown
            dueAt={riskCase.slaDueAt}
            totalMs={slaWindowMs(riskCase.riskLevel)}
            breached={riskCase.slaBreached}
          />
        </div>
      </div>

      {riskCase.assignmentStatus === 'QUEUED' && (
        <Card className="border border-warning-500/30 bg-warning-100/60">
          <p className="text-sm text-warning-700">
            Uygun kapasitede analist bulunamadığı için vaka atama kuyruğunda bekliyor.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ------------------------------------------------- Sol kolon -- */}
        <div className="space-y-5">
          {/* Risk ve AI değerlendirmesi */}
          <Card>
            <CardHeader
              title="Risk Değerlendirmesi"
              subtitle={
                assessmentReady
                  ? `Seviye: ${riskCase.riskLevel ? RISK_LEVEL_LABEL[riskCase.riskLevel] : '—'}`
                  : 'AI değerlendirmesi henüz tamamlanmadı'
              }
            />

            <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <RiskGauge
                score={riskCase.riskScore}
                level={riskCase.riskLevel}
                status={transaction.assessmentStatus}
                size="lg"
              />

              <div className="min-w-0 flex-1">
                {assessment ? (
                  <AiExplanation assessment={assessment} />
                ) : (
                  <p className="text-sm leading-relaxed text-ink-500">
                    Değerlendirme tamamlanmadığı için risk <strong>BELİRSİZ</strong> gösteriliyor ve
                    güvenli karar <strong>İNCELEME</strong> olarak korunuyor. AI servisi geri
                    geldiğinde sonuç otomatik işlenir.
                  </p>
                )}

                {riskCase.fraudTypeOverriddenFrom && (
                  <p className="mt-3 rounded-tile bg-brand-50 px-3 py-2 text-xs text-brand-800">
                    Fraud tipi{' '}
                    <strong>{FRAUD_TYPE_LABEL[riskCase.fraudTypeOverriddenFrom]}</strong> yerine{' '}
                    <strong>{riskCase.fraudType ? FRAUD_TYPE_LABEL[riskCase.fraudType] : '—'}</strong>{' '}
                    olarak değiştirildi. Bu geri bildirim AI doğruluk metriğine işlenir.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* İşlem detayı */}
          <Card>
            <CardHeader title="İşlem Bilgileri" />
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DetailItem label="Tutar" value={formatCurrency(transaction.amount)} strong />
              <DetailItem
                label="İşlem tipi"
                value={TRANSACTION_TYPE_LABEL[transaction.transactionType]}
              />
              <DetailItem label="Alıcı" value={transaction.recipient} />
              <DetailItem label="Kaynak cihaz" value={transaction.sourceDevice} />
              <DetailItem label="Konum" value={`${transaction.city}, ${transaction.country}`} />
              <DetailItem label="İşlem zamanı" value={formatDateTime(transaction.occurredAt)} />
            </dl>

            {transaction.temporaryBlock && (
              <p className="mt-4 rounded-tile bg-critical-100 px-3 py-2 text-sm text-critical-700">
                Bu işlem geçici olarak bloklandı. Nihai blok kararı analiste aittir.
              </p>
            )}
          </Card>

          {/* Müşteri doğrulaması */}
          {riskCase.verificationRequests.length > 0 && (
            <Card>
              <CardHeader title="Müşteri Doğrulaması" />
              <ul className="mt-4 space-y-3">
                {riskCase.verificationRequests.map((request) => (
                  <li key={request.id} className="rounded-tile border border-ink-100 bg-canvas p-3">
                    <p className="text-sm text-ink-900">{request.question}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      Soruldu: {formatDateTime(request.requestedAt)}
                    </p>

                    {request.response ? (
                      <p
                        className={cn(
                          'mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold',
                          request.response === 'NOT_MINE'
                            ? 'bg-critical-100 text-critical-700'
                            : 'bg-success-100 text-success-700',
                        )}
                      >
                        {request.response === 'NOT_MINE'
                          ? 'Müşteri: “Bu işlemi ben yapmadım”'
                          : 'Müşteri: “Bu işlemi ben yaptım”'}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-medium text-warning-700">
                        Müşteri yanıtı bekleniyor
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Notlar */}
          <Card>
            <CardHeader title="Analist Notları" subtitle={`${riskCase.notes.length} not`} />
            <NoteComposer
              onSubmit={(body) => run(() => actions.addNote.mutateAsync(body), 'Not eklendi.')}
              pending={actions.addNote.isPending}
            />

            {riskCase.notes.length > 0 && (
              <ul className="mt-4 space-y-3">
                {riskCase.notes.map((note) => (
                  <li key={note.id} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                      {initials(note.authorName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-400">
                        <span className="font-medium text-ink-700">{note.authorName}</span> ·{' '}
                        {formatRelative(note.createdAt)}
                      </p>
                      {/* Düz metin olarak basılır; HTML enjeksiyonu React tarafından kaçılır. */}
                      <p className="mt-0.5 text-sm whitespace-pre-wrap text-ink-900">{note.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* ------------------------------------------------- Sağ kolon -- */}
        <div className="space-y-5">
          {/* Aksiyonlar */}
          <Card>
            <CardHeader title="Aksiyonlar" />

            {allowed.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                {riskCase.status === 'KAPANDI'
                  ? 'Vaka kapandı. Yeni işlem yapılamaz.'
                  : 'Bu vakada yapabileceğin bir işlem yok.'}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {can('START_REVIEW') && (
                  <Button
                    fullWidth
                    loading={actions.startReview.isPending}
                    leadingIcon={<Clock className="size-4" />}
                    onClick={() =>
                      run(
                        () => actions.startReview.mutateAsync(riskCase.version),
                        'İnceleme başlatıldı.',
                      )
                    }
                  >
                    İncelemeye Başla
                  </Button>
                )}

                {can('REQUEST_VERIFICATION') && (
                  <Button
                    fullWidth
                    variant="secondary"
                    leadingIcon={<ShieldQuestion className="size-4" />}
                    onClick={() => setSheet('verification')}
                  >
                    Müşteri Doğrulaması İste
                  </Button>
                )}

                {can('DECIDE_APPROVE') && (
                  <Button
                    fullWidth
                    variant="secondary"
                    leadingIcon={<CheckCircle2 className="size-4" />}
                    onClick={() => setSheet('approve')}
                  >
                    İşlemi Onayla
                  </Button>
                )}

                {can('DECIDE_BLOCK') && (
                  <Button
                    fullWidth
                    variant="danger"
                    leadingIcon={<CircleSlash className="size-4" />}
                    onClick={() => setSheet('block')}
                  >
                    İşlemi Blokla
                  </Button>
                )}

                {can('OVERRIDE_FRAUD_TYPE') && (
                  <Button fullWidth variant="ghost" onClick={() => setSheet('override')}>
                    Fraud Tipini Değiştir
                  </Button>
                )}

                {can('REASSIGN') && (
                  <Button
                    fullWidth
                    variant="ghost"
                    leadingIcon={<UserCog className="size-4" />}
                    onClick={() => setSheet('assign')}
                  >
                    Manuel Ata
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Atama */}
          <Card>
            <CardHeader title="Atama" />
            <div className="mt-3 flex items-center gap-3">
              {riskCase.assignedAnalystName ? (
                <>
                  <span className="flex size-10 items-center justify-center rounded-full bg-brand-800 text-sm font-semibold text-white">
                    {initials(riskCase.assignedAnalystName)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      {riskCase.assignedAnalystName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {isAssignedToMe ? 'Sana atandı' : 'Atanmış analist'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-500">Henüz analist atanmadı.</p>
              )}
            </div>
          </Card>

          {/* Zaman çizelgesi */}
          <Card>
            <CardHeader title="Durum Geçmişi" />
            <ol className="mt-4 space-y-4">
              {riskCase.transitions.map((transition) => (
                <li key={transition.id} className="relative flex gap-3 pl-1">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {transition.fromStatus
                        ? `${CASE_STATUS_LABEL[transition.fromStatus]} → ${CASE_STATUS_LABEL[transition.toStatus]}`
                        : CASE_STATUS_LABEL[transition.toStatus]}
                    </p>
                    <p className="text-xs text-ink-400">
                      {transition.actorName} · {formatDateTime(transition.occurredAt)}
                    </p>
                    {transition.reason && (
                      <p className="mt-1 text-xs text-ink-500">{transition.reason}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {/* ----------------------------------------------------------- Paneller -- */}

      <VerificationSheet
        open={sheet === 'verification'}
        onClose={() => setSheet(null)}
        pending={actions.requestVerification.isPending}
        onSubmit={(question) =>
          run(
            () =>
              actions.requestVerification.mutateAsync({ question, version: riskCase.version }),
            'Müşteriye doğrulama bildirimi gönderildi.',
          )
        }
      />

      <DecisionSheet
        open={sheet === 'approve' || sheet === 'block'}
        decision={sheet === 'block' ? 'BLOKLANDI' : 'ONAYLANDI'}
        onClose={() => setSheet(null)}
        pending={actions.decide.isPending}
        onSubmit={(note) =>
          run(
            () =>
              actions.decide.mutateAsync({
                decision: sheet === 'block' ? 'BLOKLANDI' : 'ONAYLANDI',
                note,
                version: riskCase.version,
              }),
            sheet === 'block' ? 'İşlem bloklandı.' : 'İşlem onaylandı.',
          )
        }
      />

      <OverrideSheet
        open={sheet === 'override'}
        current={riskCase.fraudType}
        onClose={() => setSheet(null)}
        pending={actions.overrideFraudType.isPending}
        onSubmit={(fraudType, reason) =>
          run(
            () =>
              actions.overrideFraudType.mutateAsync({
                fraudType,
                reason,
                version: riskCase.version,
              }),
            'Fraud tipi güncellendi.',
          )
        }
      />

      <AssignSheet
        open={sheet === 'assign'}
        caseId={riskCase.id}
        onClose={() => setSheet(null)}
        pending={actions.assign.isPending}
        onSubmit={(analystId) =>
          run(
            () => actions.assign.mutateAsync({ analystId, version: riskCase.version }),
            'Vaka atandı.',
          )
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------- Parçacıklar -- */

function DetailItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-ink-900',
          strong ? 'text-[15px] font-semibold' : 'text-sm',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Çok satırlı metin alanı — Field tek satırlık input olduğu için ayrı tutulur. */
function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength = 1000,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full resize-y rounded-tile border bg-white px-3.5 py-2.5 text-[15px] text-ink-900',
          'placeholder:text-ink-400 focus:outline-none',
          'focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20',
          error ? 'border-danger-500' : 'border-ink-200',
        )}
      />
      <span className="mt-1 flex justify-between text-xs">
        <span className="text-danger-500">{error}</span>
        <span className="text-ink-400 tabular">
          {value.length}/{maxLength}
        </span>
      </span>
    </label>
  );
}

function NoteComposer({
  onSubmit,
  pending,
}: {
  onSubmit: (body: string) => void;
  pending: boolean;
}) {
  const [body, setBody] = useState('');

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        onSubmit(body.trim());
        setBody('');
      }}
    >
      <TextArea
        label="Yeni not"
        value={body}
        onChange={setBody}
        placeholder="İnceleme bulgularını yaz…"
        rows={3}
        maxLength={500}
      />
      <Button
        type="submit"
        size="sm"
        variant="secondary"
        loading={pending}
        disabled={!body.trim()}
        leadingIcon={<MessageSquare className="size-4" />}
      >
        Not Ekle
      </Button>
    </form>
  );
}

function VerificationSheet({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (question: string) => void;
  pending: boolean;
}) {
  const [question, setQuestion] = useState(
    'Bu işlemi siz mi gerçekleştirdiniz? Lütfen doğrulayın.',
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Müşteri Doğrulaması"
      description="Müşteriye uygulama içi bildirim gönderilir ve vaka MÜŞTERİ DOĞRULAMA durumuna geçer."
      footer={
        <Button
          fullWidth
          loading={pending}
          disabled={question.trim().length < 10}
          onClick={() => onSubmit(question.trim())}
        >
          Doğrulama İste
        </Button>
      }
    >
      <TextArea
        label="Müşteriye sorulacak soru"
        value={question}
        onChange={setQuestion}
        maxLength={300}
        error={question.trim().length < 10 ? 'En az 10 karakter yazmalısın.' : undefined}
      />
    </Sheet>
  );
}

function DecisionSheet({
  open,
  decision,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  decision: 'ONAYLANDI' | 'BLOKLANDI';
  onClose: () => void;
  onSubmit: (note: string) => void;
  pending: boolean;
}) {
  const [note, setNote] = useState('');
  const isBlock = decision === 'BLOKLANDI';

  // Blok kararında karar notu zorunludur (CASE-009).
  const noteError = isBlock && note.trim().length < 10 ? 'Blok kararında not zorunludur.' : undefined;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isBlock ? 'İşlemi Blokla' : 'İşlemi Onayla'}
      description={
        isBlock
          ? 'İşlem kalıcı olarak bloklanır, müşteriye bildirilir ve vaka BLOKLANDI durumuna geçer.'
          : 'İşlem onaylanır ve vaka ONAYLANDI durumuna geçer.'
      }
      footer={
        <Button
          fullWidth
          variant={isBlock ? 'danger' : 'primary'}
          loading={pending}
          disabled={Boolean(noteError)}
          onClick={() => onSubmit(note.trim())}
        >
          {isBlock ? 'Blokla' : 'Onayla'}
        </Button>
      }
    >
      <TextArea
        label={isBlock ? 'Karar notu (zorunlu)' : 'Karar notu'}
        value={note}
        onChange={setNote}
        placeholder="Kararının gerekçesini yaz…"
        error={noteError}
      />
    </Sheet>
  );
}

function OverrideSheet({
  open,
  current,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  current: FraudType | null;
  onClose: () => void;
  onSubmit: (fraudType: FraudType, reason: string) => void;
  pending: boolean;
}) {
  const [fraudType, setFraudType] = useState<FraudType>(current ?? 'SUPHELI_DAVRANIS');
  const [reason, setReason] = useState('');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Fraud Tipini Değiştir"
      description="Değişiklik AI servisine doğruluk geri bildirimi olarak iletilir."
      footer={
        <Button
          fullWidth
          loading={pending}
          disabled={reason.trim().length < 5 || fraudType === current}
          onClick={() => onSubmit(fraudType, reason.trim())}
        >
          Değiştir
        </Button>
      }
    >
      <fieldset className="space-y-2">
        <legend className="mb-1.5 text-sm font-medium text-ink-700">Yeni fraud tipi</legend>
        {FRAUD_TYPES.map((type) => (
          <label
            key={type}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-tile border px-3.5 py-2.5',
              fraudType === type ? 'border-brand-600 bg-brand-50' : 'border-ink-200 bg-white',
            )}
          >
            <input
              type="radio"
              name="fraudType"
              value={type}
              checked={fraudType === type}
              onChange={() => setFraudType(type)}
              className="accent-brand-600"
            />
            <span className="text-sm text-ink-900">{FRAUD_TYPE_LABEL[type]}</span>
            {type === current && <Badge tone="neutral">Mevcut</Badge>}
          </label>
        ))}
      </fieldset>

      <div className="mt-4">
        <TextArea
          label="Değiştirme gerekçesi"
          value={reason}
          onChange={setReason}
          rows={3}
          maxLength={300}
        />
      </div>
    </Sheet>
  );
}

function AssignSheet({
  open,
  caseId,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  caseId: string;
  onClose: () => void;
  onSubmit: (analystId: string) => void;
  pending: boolean;
}) {
  const { data: candidates, isPending } = useAssignmentCandidates(caseId, open);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Manuel Atama"
      description="Adaylar uzmanlık (0.50), kapasite (0.30) ve performans (0.20) ağırlıklarıyla sıralanır."
      footer={
        <Button fullWidth loading={pending} disabled={!selected} onClick={() => onSubmit(selected!)}>
          Ata
        </Button>
      }
    >
      {isPending ? (
        <SkeletonList rows={3} />
      ) : !candidates || candidates.length === 0 ? (
        <p className="text-sm text-ink-500">Uygun kapasitede analist bulunamadı.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((candidate) => {
            const full = candidate.activeCases >= 10;
            return (
              <li key={candidate.analystId}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-tile border px-3.5 py-3',
                    selected === candidate.analystId
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-ink-200 bg-white',
                    full && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name="analyst"
                    disabled={full}
                    checked={selected === candidate.analystId}
                    onChange={() => setSelected(candidate.analystId)}
                    className="accent-brand-600"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {candidate.analystName}
                    </p>
                    <p className="text-xs text-ink-500 tabular">
                      Skor {candidate.assignmentScore.toFixed(2)} · Uzmanlık{' '}
                      {candidate.expertiseMatch.toFixed(2)} · Kapasite{' '}
                      {candidate.capacityRatio.toFixed(2)} · Performans{' '}
                      {candidate.performance.toFixed(2)}
                    </p>
                  </div>
                  <Badge tone={full ? 'danger' : 'neutral'}>{candidate.activeCases}/10</Badge>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
