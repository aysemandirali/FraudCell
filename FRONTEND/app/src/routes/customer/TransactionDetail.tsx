import { useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Loader2, ShieldQuestion } from 'lucide-react';
import { AppBar } from '@/components/layout/AppBar';
import { Banner, Card, RiskGauge, SectionTitle, Skeleton } from '@/components/ui';
import { AiExplanation } from '@/components/domain/AiExplanation';
import { useAssessment, useTransaction } from '@/hooks/queries';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { DECISION_LABEL, displayDecision } from '@/domain/risk';
import { TRANSACTION_TYPE_LABEL } from '@/domain/types';

/**
 * İşlem detayı. En kritik ekran: AI değerlendirmesi asenkron olduğu için
 * sayfa önce PENDING açılır, sonuç SSE ile düştüğünde canlı olarak dolar.
 */
export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const completed = transaction?.assessmentStatus === 'COMPLETED';
  const { data: assessment } = useAssessment(id, completed);

  if (isLoading || !transaction) {
    return (
      <>
        <AppBar title="İşlem Detayı" back />
        <div className="mx-auto max-w-lg space-y-4 px-4 pt-5">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      </>
    );
  }

  const pending = transaction.assessmentStatus === 'PENDING';
  const decision = displayDecision(transaction.assessmentStatus, transaction.decision);

  return (
    <>
      <AppBar title={transaction.transactionNo} back />

      <div className="mx-auto max-w-lg space-y-5 px-4 pt-5">
        {/* --- Tutar ve alıcı --- */}
        <Card className="text-center">
          <p className="text-sm text-ink-500">{TRANSACTION_TYPE_LABEL[transaction.transactionType]}</p>
          <p className="mt-1 text-[32px] leading-tight font-bold text-ink-900 tabular">
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-1 text-[15px] text-ink-700">{transaction.recipient}</p>
          <p className="mt-0.5 text-sm text-ink-400">{formatDateTime(transaction.occurredAt)}</p>
        </Card>

        {/* --- Geçici blok uyarısı --- */}
        {transaction.temporaryBlock && (
          <Banner tone="danger">
            <span className="font-semibold">Bu işlem geçici olarak bloklandı.</span> Güvenlik ekibi
            incelemesini tamamlayana kadar tutar hesabından çıkmayacak.
          </Banner>
        )}

        {/* --- Risk değerlendirmesi --- */}
        <Card>
          <SectionTitle className="!mb-4">Risk Değerlendirmesi</SectionTitle>

          <div className="flex items-center gap-5">
            <RiskGauge
              score={transaction.riskScore}
              level={transaction.riskLevel}
              status={transaction.assessmentStatus}
              size="lg"
            />

            <div className="min-w-0 flex-1">
              {pending ? (
                <>
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-700">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Değerlendiriliyor
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    İşlemin güvenli şekilde kaydedildi. Yapay zekâ değerlendirmesi tamamlandığında
                    sonuç burada otomatik görünecek.
                  </p>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-ink-900">
                    {decision === 'BLOK' ? (
                      <Ban className="size-4.5 text-danger-500" aria-hidden />
                    ) : decision === 'ONAY' ? (
                      <CheckCircle2 className="size-4.5 text-success-500" aria-hidden />
                    ) : (
                      <ShieldQuestion className="size-4.5 text-warning-500" aria-hidden />
                    )}
                    {DECISION_LABEL[decision]}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">
                    {decision === 'ONAY'
                      ? 'İşlemin güvenli bulundu ve onaylandı.'
                      : decision === 'BLOK'
                        ? 'Yüksek risk tespit edildi. İşlem geçici olarak bloklandı ve güvenlik ekibine iletildi.'
                        : 'İşlemin manuel incelemeye alındı. Güvenlik ekibimiz kısa süre içinde değerlendirecek.'}
                  </p>
                </>
              )}
            </div>
          </div>

          {assessment && (
            <div className="mt-5 border-t border-ink-100 pt-5">
              <AiExplanation assessment={assessment} />
            </div>
          )}
        </Card>

        {/* --- İşlem künyesi --- */}
        <Card flush>
          <SectionTitle className="!mb-0 px-4 pt-4">İşlem Bilgileri</SectionTitle>
          <dl className="divide-y divide-ink-100">
            <DetailRow label="İşlem No" value={transaction.transactionNo} mono />
            <DetailRow label="Alıcı" value={transaction.recipient} />
            <DetailRow label="Konum" value={`${transaction.city}, ${transaction.country}`} />
            <DetailRow label="Cihaz" value={transaction.sourceDevice} />
            <DetailRow label="Tarih" value={formatDateTime(transaction.occurredAt)} />
          </dl>
        </Card>
      </div>
    </>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-sm text-ink-500">{label}</dt>
      <dd
        className={
          mono
            ? 'truncate font-mono text-sm text-ink-900'
            : 'truncate text-sm font-medium text-ink-900'
        }
      >
        {value}
      </dd>
    </div>
  );
}
