import { useState } from 'react';
import { ClipboardCopy, KeyRound, Lock, ScrollText, UserPlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ApiError } from '@/api/client';
import { formatDateTime } from '@/lib/format';
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  SectionTitle,
  Sheet,
  SkeletonList,
  Tabs,
  useToast,
} from '@/components/ui';
import { useAnalysts, useAuditLog, useCreateStaff } from '@/hooks/queries';
import { useCurrentUser } from '@/stores/auth';
import {
  FRAUD_TYPE_LABEL,
  REGION_LABEL,
  ROLE_LABEL,
  type FraudType,
  type Region,
} from '@/domain/types';

type Tab = 'staff' | 'audit';

const FRAUD_TYPES: FraudType[] = [
  'CALINTI_KART',
  'HESAP_ELE_GECIRME',
  'PARA_AKLAMA',
  'SUPHELI_DAVRANIS',
];

const REGIONS: Region[] = [
  'MARMARA',
  'EGE',
  'AKDENIZ',
  'IC_ANADOLU',
  'KARADENIZ',
  'DOGU_ANADOLU',
  'GUNEYDOGU_ANADOLU',
];

/**
 * Yönetim ekranı: personel hesapları ve audit log.
 *
 * Personel oluşturma yalnızca admin'e açıktır (ROLE-012); audit log admin ve
 * süpervizör tarafından okunabilir (ROLE-013). Audit kayıtları append-only'dir —
 * bu ekranda düzenleme veya silme aksiyonu bilinçli olarak yoktur (AUD-006).
 */
export default function Administration() {
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>('staff');

  return (
    <div className="space-y-5">
      <SectionTitle>Yönetim</SectionTitle>

      <Card flush>
        <Tabs<Tab>
          items={[
            { value: 'staff', label: 'Personel' },
            { value: 'audit', label: 'Audit Log' },
          ]}
          value={tab}
          onChange={setTab}
          className="rounded-t-card"
        />
      </Card>

      {tab === 'staff' ? <StaffPanel canCreate={user?.role === 'ADMIN'} /> : <AuditPanel />}
    </div>
  );
}

/* -------------------------------------------------------------- Personel -- */

function StaffPanel({ canCreate }: { canCreate: boolean }) {
  const { data: analysts, isPending } = useAnalysts();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button leadingIcon={<UserPlus className="size-4" />} onClick={() => setOpen(true)}>
            Personel Ekle
          </Button>
        </div>
      )}

      {isPending ? (
        <SkeletonList rows={4} />
      ) : !analysts || analysts.length === 0 ? (
        <EmptyState icon={<UserPlus />} title="Henüz personel yok" />
      ) : (
        <Card flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-canvas text-left text-xs text-ink-500">
                  <th scope="col" className="px-4 py-2.5 font-medium">Personel</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Uzmanlık</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Bölge</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Kapasite</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Durum</th>
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
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {analyst.regions
                        .map((region) => REGION_LABEL[region as Region] ?? region)
                        .join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{analyst.activeCases}/10</td>
                    <td className="px-4 py-3 text-right">
                      {analyst.locked ? (
                        <Badge tone="danger" className="gap-1">
                          <Lock className="size-3" />
                          Kilitli
                        </Badge>
                      ) : (
                        <Badge tone="success">Aktif</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateStaffSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateStaffSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const createStaff = useCreateStaff();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ANALYST' | 'SUPERVISOR'>('ANALYST');
  const [specialties, setSpecialties] = useState<FraudType[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [created, setCreated] = useState<{ id: string; temporaryPassword: string } | null>(null);

  const valid =
    fullName.trim().length >= 3 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
    specialties.length > 0 &&
    regions.length > 0;

  function toggle<T>(list: T[], value: T, set: (next: T[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function reset() {
    setFullName('');
    setEmail('');
    setRole('ANALYST');
    setSpecialties([]);
    setRegions([]);
    setCreated(null);
  }

  async function submit() {
    try {
      const result = await createStaff.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim(),
        role,
        specialties,
        regions,
      });
      setCreated(result);
      toast.success('Personel hesabı oluşturuldu.');
    } catch (error) {
      toast.error(
        'Hesap oluşturulamadı',
        error instanceof ApiError ? error.message : 'Beklenmeyen bir hata oluştu.',
      );
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Personel Hesabı Oluştur"
      description="Hesap oluşturulduğunda tek kullanımlık geçici şifre üretilir."
      footer={
        created ? (
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Kapat
          </Button>
        ) : (
          <Button fullWidth loading={createStaff.isPending} disabled={!valid} onClick={submit}>
            Oluştur
          </Button>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <Banner tone="success">Hesap oluşturuldu. Geçici şifreyi personele güvenli bir kanaldan ilet.</Banner>

          <div className="rounded-tile border border-ink-200 bg-canvas p-4">
            <p className="flex items-center gap-2 text-xs text-ink-500">
              <KeyRound className="size-4" />
              Geçici şifre
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="font-mono text-lg font-semibold text-ink-900">
                {created.temporaryPassword}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(created.temporaryPassword);
                  toast.info('Şifre panoya kopyalandı.');
                }}
                className="rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100"
                aria-label="Şifreyi kopyala"
              >
                <ClipboardCopy className="size-4.5" />
              </button>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ink-400">
            Şifre politikası: en az 8 karakter, bir büyük harf, bir rakam ve bir özel karakter.
            Şifreler veritabanında Argon2id ile hash'lenir, düz metin saklanmaz.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="Ad Soyad"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ayşe Yılmaz"
          />
          <Field
            label="E-posta"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ayse.yilmaz@turkcell.com.tr"
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink-700">Rol</legend>
            <div className="flex gap-2">
              {(['ANALYST', 'SUPERVISOR'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRole(option)}
                  aria-pressed={role === option}
                  className={cn(
                    'flex-1 rounded-pill border px-4 py-2 text-sm font-medium transition-colors',
                    role === option
                      ? 'border-brand-600 bg-brand-50 text-brand-800'
                      : 'border-ink-200 bg-white text-ink-700',
                  )}
                >
                  {ROLE_LABEL[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <MultiSelect
            legend="Uzmanlık alanları"
            hint="Atama skorunun %50'sini belirler."
            options={FRAUD_TYPES.map((type) => ({ value: type, label: FRAUD_TYPE_LABEL[type] }))}
            selected={specialties}
            onToggle={(value) => toggle(specialties, value, setSpecialties)}
          />

          <MultiSelect
            legend="Bölgeler"
            options={REGIONS.map((region) => ({ value: region, label: REGION_LABEL[region] }))}
            selected={regions}
            onToggle={(value) => toggle(regions, value, setRegions)}
          />
        </div>
      )}
    </Sheet>
  );
}

function MultiSelect<T extends string>({
  legend,
  hint,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink-700">{legend}</legend>
      {hint && <p className="mb-2 text-xs text-ink-400">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                'rounded-pill border px-3.5 py-1.5 text-sm transition-colors',
                active
                  ? 'border-aqua-500 bg-aqua-500 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------- Audit log -- */

function AuditPanel() {
  const [page, setPage] = useState(1);
  const { data, isPending } = useAuditLog(page);

  if (isPending) return <SkeletonList rows={6} />;
  if (!data || data.items.length === 0) {
    return <EmptyState icon={<ScrollText />} title="Audit kaydı yok" />;
  }

  return (
    <div className="space-y-4">
      <Card flush>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-canvas text-left text-xs text-ink-500">
                <th scope="col" className="px-4 py-2.5 font-medium">Zaman</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Aktör</th>
                <th scope="col" className="px-4 py-2.5 font-medium">İşlem</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Kaynak</th>
                <th scope="col" className="px-4 py-2.5 font-medium">IP</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Sonuç</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.items.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500 tabular">
                    {formatDateTime(entry.occurredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{entry.actorName}</p>
                    <p className="font-mono text-[11px] text-ink-400">{entry.sourceService}</p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-ink-700">{entry.action}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500">
                    {entry.resourceType}
                    <span className="ml-1 font-mono text-ink-400">
                      {entry.resourceId.slice(-8)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-400">{entry.ipAddress}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge tone={entry.result === 'SUCCESS' ? 'success' : 'danger'}>
                      {entry.result === 'SUCCESS' ? 'Başarılı' : 'Başarısız'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-500 tabular">
          {data.page}/{data.totalPages} · {data.totalItems} kayıt
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={data.page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Önceki
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={data.page >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Sonraki
          </Button>
        </div>
      </div>

      <p className="px-1 text-xs leading-relaxed text-ink-400">
        Audit kayıtları append-only tutulur. API üzerinden değiştirme veya silme ucu bulunmaz;
        kayıtlar diğer servislerden <code className="font-mono">audit.entry.requested</code> event'i
        ile Identity Service'e ulaşır.
      </p>
    </div>
  );
}
