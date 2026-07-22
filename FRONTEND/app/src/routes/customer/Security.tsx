import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageSquareWarning, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { LargeTitleBar } from '@/components/layout/AppBar';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  IconTile,
  SectionTitle,
  Sheet,
  SkeletonList,
  useToast,
} from '@/components/ui';
import { useCase, useCaseActions, useCases } from '@/hooks/queries';
import { ApiError } from '@/api/client';
import { formatCurrency, formatRelative } from '@/lib/format';
import { CASE_STATUS_LABEL } from '@/domain/types';

/**
 * Müşteri güvenlik merkezi.
 * Doğrulama isteklerini ve kapanmış vakaların geri bildirimini yönetir.
 */
export default function Security() {
  const { data: pending, isLoading } = useCases({ status: 'MUSTERI_DOGRULAMA' });
  const { data: closed } = useCases({ status: 'KAPANDI' });
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const pendingItems = pending?.items ?? [];
  const closedItems = closed?.items ?? [];

  return (
    <>
      <LargeTitleBar title="Güvenlik" />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4">
        <Banner tone="info">
          Şüpheli bulunan işlemlerde sana soruyoruz. Yanıtın doğrudan güvenlik ekibine gider ve
          işlemin akıbetini belirler.
        </Banner>

        <section>
          <SectionTitle>Doğrulaman Bekleniyor</SectionTitle>

          {isLoading ? (
            <SkeletonList rows={2} />
          ) : pendingItems.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ShieldCheck />}
                title="Bekleyen doğrulama yok"
                description="Şu anda senden onay bekleyen bir işlem bulunmuyor. İşlemlerin korunuyor."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((riskCase) => {
                const question = riskCase.verificationRequests.find(
                  (request) => !request.respondedAt,
                );

                return (
                  <Card key={riskCase.id} rail="bg-warning-500">
                    <div className="flex items-start gap-3">
                      <IconTile tone="warning">
                        <MessageSquareWarning />
                      </IconTile>

                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-ink-900">
                          {formatCurrency(riskCase.transaction.amount)} ·{' '}
                          {riskCase.transaction.recipient}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-400">
                          {riskCase.transaction.transactionNo} ·{' '}
                          {formatRelative(riskCase.createdAt)}
                        </p>

                        {question && (
                          <p className="mt-3 rounded-tile bg-warning-100 px-3.5 py-3 text-sm leading-relaxed text-warning-700">
                            {question.question}
                          </p>
                        )}

                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => setActiveCaseId(riskCase.id)}
                        >
                          Yanıtla
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {closedItems.length > 0 && (
          <section>
            <SectionTitle>Sonuçlanan İncelemeler</SectionTitle>
            <Card flush>
              <div className="[&>*+*]:border-t [&>*+*]:border-ink-100">
                {closedItems.map((riskCase) => (
                  <Link
                    key={riskCase.id}
                    to={`/islem/${riskCase.transactionId}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-50"
                  >
                    <IconTile tone="success" size="sm">
                      <CheckCircle2 />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink-900">
                        {riskCase.transaction.recipient}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-500">
                        {riskCase.caseNo} · {formatRelative(riskCase.closedAt ?? riskCase.createdAt)}
                      </p>
                    </div>
                    <Badge tone="success">{CASE_STATUS_LABEL[riskCase.status]}</Badge>
                  </Link>
                ))}
              </div>
            </Card>
          </section>
        )}
      </div>

      <VerificationSheet caseId={activeCaseId} onClose={() => setActiveCaseId(null)} />
    </>
  );
}

/**
 * Doğrulama yanıtı paneli.
 * "Ben yapmadım" seçilirse risk skoru en az 0.91'e çekilir ve işlem geçici
 * bloklanır; nihai blok kararını yine analist verir (doküman §11).
 */
function VerificationSheet({ caseId, onClose }: { caseId: string | null; onClose: () => void }) {
  const toast = useToast();
  const { data: riskCase } = useCase(caseId ?? undefined);
  const { respondVerification } = useCaseActions(caseId ?? undefined);

  async function respond(response: 'MINE' | 'NOT_MINE') {
    try {
      await respondVerification.mutateAsync(response);
      toast.success(
        response === 'MINE' ? 'Teşekkürler, yanıtın alındı' : 'İşlem güvenlik ekibine iletildi',
        response === 'MINE'
          ? 'Güvenlik ekibimiz incelemesini tamamlayacak.'
          : 'İşlemin geçici olarak bloklandı ve öncelikli incelemeye alındı.',
      );
      onClose();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Yanıtın gönderilemedi.');
    }
  }

  const question = riskCase?.verificationRequests.find((request) => !request.respondedAt);

  return (
    <Sheet
      open={Boolean(caseId)}
      onClose={onClose}
      title="İşlemi doğrula"
      description={riskCase?.transaction.transactionNo}
    >
      {riskCase && (
        <div className="space-y-5">
          <Card className="bg-canvas shadow-none">
            <p className="text-2xl font-bold text-ink-900 tabular">
              {formatCurrency(riskCase.transaction.amount)}
            </p>
            <p className="mt-1 text-[15px] text-ink-700">{riskCase.transaction.recipient}</p>
            <p className="mt-0.5 text-sm text-ink-400">
              {riskCase.transaction.city}, {riskCase.transaction.country} ·{' '}
              {riskCase.transaction.sourceDevice}
            </p>
          </Card>

          {question && (
            <p className="text-[15px] leading-relaxed font-medium text-ink-900">
              {question.question}
            </p>
          )}

          <div className="grid gap-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leadingIcon={<ThumbsUp className="size-5" />}
              loading={respondVerification.isPending}
              onClick={() => respond('MINE')}
            >
              Evet, bu işlemi ben yaptım
            </Button>

            <Button
              variant="danger"
              size="lg"
              fullWidth
              leadingIcon={<ThumbsDown className="size-5" />}
              loading={respondVerification.isPending}
              onClick={() => respond('NOT_MINE')}
            >
              Hayır, bu işlemi ben yapmadım
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-ink-400">
            "Ben yapmadım" dersen işlem anında geçici bloka alınır ve vaka en yüksek öncelikle
            güvenlik uzmanına yönlendirilir.
          </p>
        </div>
      )}
    </Sheet>
  );
}
