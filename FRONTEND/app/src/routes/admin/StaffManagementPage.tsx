import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Users } from 'lucide-react';
import {
  createStaff,
  getStaffReferences,
  listStaff,
  updateStaffFully,
  type StaffEditValues,
} from '@/features/staff/api';
import type { StaffResponse } from '@/shared/api/contract';
import type { AnalystSpecialty, OperationRegion, Role } from '@/shared/api/enums';
import { ROLE_LABEL } from '@/shared/api/enums';
import { queryKeys } from '@/shared/api/query-keys';
import { formatDateTime, fullName } from '@/shared/lib/format';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  PasswordField,
  Sheet,
  SkeletonList,
  ToneBadge,
  useToast,
} from '@/shared/ui';

interface StaffFormValues extends StaffEditValues {
  email: string;
  password: string;
}

const EMPTY_FORM: StaffFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'ANALYST',
  specialties: [],
  regions: [],
  assignmentEnabled: true,
  isActive: true,
};

export function StaffManagementPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffResponse | null>(null);
  const [values, setValues] = useState<StaffFormValues>(EMPTY_FORM);
  const staff = useQuery({ queryKey: queryKeys.staff.list, queryFn: () => listStaff(100) });
  const references = useQuery({ queryKey: ['staff', 'references'], queryFn: getStaffReferences });
  const save = useMutation({
    mutationFn: async () => {
      if (editing) return updateStaffFully(editing, values);
      return createStaff({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        role: values.role,
        specialties: values.specialties,
        regions: values.regions,
        assignmentEnabled: values.assignmentEnabled,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      toast.success(editing ? 'Personel güncellendi' : 'Personel oluşturuldu');
    },
    onError: (error) => toast.fromError(error),
  });

  const openCreate = () => {
    setEditing(null);
    setValues(EMPTY_FORM);
    setOpen(true);
  };
  const openEdit = (person: StaffResponse) => {
    setEditing(person);
    setValues({
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      password: '',
      role: person.role,
      specialties: person.specialties,
      regions: person.regions,
      assignmentEnabled: person.assignmentEnabled,
      isActive: person.isActive,
    });
    setOpen(true);
  };
  const toggle = <T extends string>(items: T[], value: T): T[] =>
    items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
  const valid = Boolean(
    values.firstName.trim() &&
    values.lastName.trim() &&
    (editing || (values.email.trim() && values.password.length >= 8)) &&
    values.specialties.length > 0 &&
    values.regions.length > 0,
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Personel yönetimi</h1>
          <p className="mt-1 text-sm text-ink-500">Roller, uzmanlıklar ve atama uygunluğu.</p>
        </div>
        <Button leadingIcon={<Plus className="size-4" />} onClick={openCreate}>Personel ekle</Button>
      </header>

      <section className="mt-6">
        {staff.isPending ? <SkeletonList rows={6} /> : null}
        {staff.isError ? <ErrorState error={staff.error} onRetry={() => void staff.refetch()} /> : null}
        {staff.data?.items.length === 0 ? <EmptyState icon={<Users />} title="Personel kaydı yok" /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.data?.items.map((person) => (
            <article key={person.id} className="surface-card flex min-h-44 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-ink-900">{fullName(person.firstName, person.lastName)}</h2>
                  <p className="mt-1 truncate text-sm text-ink-500">{person.email}</p>
                </div>
                <button type="button" aria-label={`${person.firstName} ${person.lastName} düzenle`} onClick={() => openEdit(person)} className="rounded-full p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-700">
                  <Pencil className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ToneBadge toneClass="bg-brand-100 text-brand-700">{ROLE_LABEL[person.role]}</ToneBadge>
                <ToneBadge toneClass={person.isActive ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}>{person.isActive ? 'Aktif' : 'Pasif'}</ToneBadge>
                {person.role === 'ANALYST' ? <ToneBadge toneClass={person.assignmentEnabled ? 'bg-ink-100 text-ink-700' : 'bg-warning-100 text-warning-700'}>{person.assignmentEnabled ? 'Atamaya açık' : 'Atama kapalı'}</ToneBadge> : null}
              </div>
              <p className="mt-auto pt-4 text-xs text-ink-400">Oluşturma: {formatDateTime(person.createdAt)}</p>
            </article>
          ))}
        </div>
      </section>

      <Sheet
        open={open}
        onOpenChange={(next) => { if (!next && !save.isPending) setOpen(false); }}
        title={editing ? 'Personeli düzenle' : 'Yeni personel'}
        footer={<Button loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Kaydet</Button>}
      >
        {references.isError ? <ErrorState error={references.error} onRetry={() => void references.refetch()} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ad" value={values.firstName} onChange={(event) => setValues((current) => ({ ...current, firstName: event.target.value }))} />
          <Field label="Soyad" value={values.lastName} onChange={(event) => setValues((current) => ({ ...current, lastName: event.target.value }))} />
        </div>
        {!editing ? (
          <div className="mt-3 grid gap-3">
            <Field type="email" label="E-posta" value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} />
            <PasswordField label="Geçici şifre" hint="En az 8 karakter, büyük/küçük harf, rakam ve özel karakter." value={values.password} onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))} />
          </div>
        ) : null}

        <label className="mt-4 block text-sm font-semibold text-ink-700">Rol
          <select aria-label="Rol" value={values.role} onChange={(event) => setValues((current) => ({ ...current, role: event.target.value as Role }))} className="mt-2 h-11 w-full rounded-md border border-ink-200 bg-surface px-3 font-normal">
            {references.data?.roles.filter((item) => item.code !== 'CUSTOMER').map((item) => <option key={item.code} value={item.code}>{item.displayName}</option>)}
          </select>
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink-700">Uzmanlıklar</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {references.data?.specialties.map((item) => {
              const code = item.code as AnalystSpecialty;
              return <label key={code} className="flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700"><input type="checkbox" checked={values.specialties.includes(code)} onChange={() => setValues((current) => ({ ...current, specialties: toggle(current.specialties, code) }))} />{item.displayName}</label>;
            })}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink-700">Bölgeler</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {references.data?.regions.map((item) => {
              const code = item.code as OperationRegion;
              return <label key={code} className="flex items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-700"><input type="checkbox" checked={values.regions.includes(code)} onChange={() => setValues((current) => ({ ...current, regions: toggle(current.regions, code) }))} />{item.displayName}</label>;
            })}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-md bg-ink-100 px-3 py-3 text-sm font-medium text-ink-700"><input type="checkbox" checked={values.assignmentEnabled} onChange={(event) => setValues((current) => ({ ...current, assignmentEnabled: event.target.checked }))} />Atamaya açık</label>
          {editing ? <label className="flex items-center gap-2 rounded-md bg-ink-100 px-3 py-3 text-sm font-medium text-ink-700"><input type="checkbox" checked={values.isActive} onChange={(event) => setValues((current) => ({ ...current, isActive: event.target.checked }))} />Aktif hesap</label> : null}
        </div>
      </Sheet>
    </main>
  );
}
