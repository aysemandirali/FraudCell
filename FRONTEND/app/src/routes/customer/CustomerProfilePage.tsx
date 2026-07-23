import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Laptop, LogOut, Smartphone } from 'lucide-react';
import { useCurrentUser } from '@/features/authentication/useSession';
import { logout } from '@/features/authentication/session';
import { listSessions, revokeSession } from '@/features/customer/api';
import { ROLE_LABEL } from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime, fullName } from '@/shared/lib/format';
import {
  Avatar,
  Button,
  CustomerPageHeader,
  EmptyState,
  ErrorState,
  SkeletonList,
  ToneBadge,
  useToast,
} from '@/shared/ui';

export function CustomerProfilePage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const sessions = useQuery({ queryKey: queryKeys.sessions, queryFn: listSessions });
  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
      toast.success('Oturum kapatıldı');
    },
    onError: (error) => toast.fromError(error),
  });

  const displayName = fullName(user.firstName, user.lastName) || 'FraudCell müşterisi';

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <CustomerPageHeader
        title="Profil ve güvenlik"
        description="Hesap bilgilerini ve oturum açılmış cihazlarını güvenle yönet."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(20rem,.8fr)_minmax(0,1.55fr)] lg:items-start">
        <div className="contents lg:block">
        <section
          className="order-1 surface-elevated overflow-hidden p-5 lg:p-6"
          aria-labelledby="profile-title"
        >
          <div className="flex items-center gap-3">
            <Avatar name={displayName} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 id="profile-title" className="font-semibold text-ink-900">
                {displayName}
              </h2>
              <p className="mt-0.5 text-sm text-ink-500">{user.gsmNumber ?? user.email}</p>
            </div>
            <ToneBadge toneClass="bg-success-100 text-success-700">
              {ROLE_LABEL[user.role]}
            </ToneBadge>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-ink-100 pt-5">
            <div className="rounded-[1rem] bg-brand-50 p-3.5">
              <dt className="text-[11px] text-ink-500">Hesap durumu</dt>
              <dd className="mt-1 text-sm font-semibold text-success-700">Korumada</dd>
            </div>
            <div className="rounded-[1rem] bg-brand-50 p-3.5">
              <dt className="text-[11px] text-ink-500">Aktif cihaz</dt>
              <dd className="mt-1 text-sm font-semibold tabular text-brand-900">
                {sessions.isPending ? '—' : sessions.data?.length ?? 0}
              </dd>
            </div>
          </dl>
        </section>

          <section className="order-3 mt-4">
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate({ to: '/auth', replace: true }));
              }}
              className="flex w-full items-center justify-center gap-2 rounded-[1rem] border border-danger-500/25 bg-white/80 py-3 text-sm font-semibold text-danger-600 shadow-[0_10px_24px_-22px_rgba(198,40,40,.7)] transition-colors hover:bg-danger-100"
            >
              <LogOut className="size-4" aria-hidden />
              Çıkış yap
            </button>
          </section>
        </div>

        <section
          className="order-2 mt-7 lg:mt-0"
          aria-labelledby="sessions-title"
        >
          <div className="mb-4">
            <p className="text-[10px] font-bold tracking-[0.14em] text-brand-600 uppercase">Oturum güvenliği</p>
            <h2 id="sessions-title" className="mt-1 text-h2 text-ink-800">Aktif cihazlar</h2>
            <p className="mt-1 text-sm text-ink-500">Tanımadığın bir cihazın oturumunu tek dokunuşla kapat.</p>
          </div>
          {sessions.isPending ? <SkeletonList rows={2} /> : null}
          {sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
          ) : null}
          {sessions.data?.length === 0 ? (
            <EmptyState icon={<Laptop />} title="Aktif cihaz bulunamadı" />
          ) : null}
          <div className="space-y-3">
            {sessions.data?.map((session) => (
              <article key={session.id} className="surface-card flex items-start gap-3 p-4 sm:p-5">
                <span className="mt-0.5 text-ink-400">
                  {session.userAgent?.toLocaleLowerCase('tr-TR').includes('mobile') ? (
                    <Smartphone className="size-5" aria-hidden />
                  ) : (
                    <Laptop className="size-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">
                      {session.isCurrent ? 'Bu cihaz' : 'Diğer cihaz'}
                    </p>
                    {session.isCurrent ? (
                      <ToneBadge toneClass="bg-success-100 text-success-700">Aktif</ToneBadge>
                    ) : null}
                  </div>
                  <p className="mt-1 break-words text-xs text-ink-500">
                    {session.userAgent ?? 'Cihaz bilgisi yok'}
                  </p>
                  <p className="mt-2 text-xs text-ink-400">
                    Son kullanım: {formatDateTime(session.lastUsedAt ?? session.createdAt)}
                  </p>
                </div>
                {!session.isCurrent ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revoke.isPending && revoke.variables === session.id}
                    onClick={() => revoke.mutate(session.id)}
                  >
                    Kapat
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
