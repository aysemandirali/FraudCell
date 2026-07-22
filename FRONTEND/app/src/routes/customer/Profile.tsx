import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  KeyRound,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { LargeTitleBar } from '@/components/layout/AppBar';
import { IconTile, ListGroup, ListRow, SectionTitle } from '@/components/ui';
import { formatMsisdn, initials } from '@/lib/format';
import { useAuth } from '@/stores/auth';

export default function Profile() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const signOut = useAuth((state) => state.signOut);

  async function handleSignOut() {
    await signOut();
    navigate('/giris', { replace: true });
  }

  return (
    <>
      <LargeTitleBar title="Profil" />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4">
        <div className="surface-card flex items-center gap-4 p-5">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-800 text-lg font-bold text-white">
            {initials(user?.fullName ?? '')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink-900">{user?.fullName}</p>
            <p className="mt-0.5 text-sm text-ink-500 tabular">
              {user?.msisdn ? `0${formatMsisdn(user.msisdn)}` : ''}
            </p>
          </div>
        </div>

        <section>
          <SectionTitle>Güvenlik</SectionTitle>
          <ListGroup>
            <ListRow
              icon={
                <IconTile tone="brand">
                  <ShieldCheck />
                </IconTile>
              }
              title="İşlem Güvenliği"
              subtitle="Doğrulama talepleri ve risk durumu"
              to="/guvenlik"
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <KeyRound />
                </IconTile>
              }
              title="Şifre ve Giriş"
              subtitle="Uygulama şifreni değiştir"
              onClick={() => {}}
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <Smartphone />
                </IconTile>
              }
              title="Kayıtlı Cihazlarım"
              subtitle="Yeni cihaz risk skorunu etkiler"
              onClick={() => {}}
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <Bell />
                </IconTile>
              }
              title="Bildirimler"
              to="/bildirimler"
            />
          </ListGroup>
        </section>

        <section>
          <SectionTitle>Destek Merkezi</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="surface-card flex flex-col items-center gap-3 p-5 transition-colors hover:bg-brand-50"
            >
              <IconTile tone="brand">
                <Mail />
              </IconTile>
              <span className="text-[15px] font-medium text-ink-900">Taleplerim</span>
            </button>
            <button
              type="button"
              className="surface-card flex flex-col items-center gap-3 p-5 transition-colors hover:bg-brand-50"
            >
              <IconTile tone="brand">
                <HelpCircle />
              </IconTile>
              <span className="text-[15px] font-medium text-ink-900">Sıkça Sorulan Sorular</span>
            </button>
          </div>
        </section>

        <section>
          <SectionTitle>Diğer</SectionTitle>
          <ListGroup>
            <ListRow
              icon={
                <IconTile tone="brand">
                  <BarChart3 />
                </IconTile>
              }
              title="Limitlerim"
              onClick={() => {}}
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <FileText />
                </IconTile>
              }
              title="Sözleşmeler"
              onClick={() => {}}
            />
            <ListRow
              icon={
                <IconTile tone="brand">
                  <FileText />
                </IconTile>
              }
              title="Bilgi Güvenliği"
              onClick={() => {}}
            />
          </ListGroup>
        </section>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-4 text-center text-[15px] font-semibold text-danger-500 transition-colors hover:text-danger-700"
        >
          Çıkış Yap
        </button>

        <p className="pb-4 text-center text-xs text-ink-400">
          FraudCell v0.1.0 · CodeNight 2026
          <br />
          Turkcell Ödeme ve Elektronik Para Hizmetleri A.Ş.
        </p>
      </div>
    </>
  );
}
