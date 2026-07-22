import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, ShieldAlert } from 'lucide-react';
import { Banner, Button, Field, PasswordField } from '@/components/ui';
import { LogoWordmark } from '@/components/brand/Logo';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { homePathFor, useAuth } from '@/stores/auth';

/** Hızlı demo girişleri — jüri her rolü tek tıkla görebilsin. */
const DEMO_ACCOUNTS = [
  { label: 'Analist', email: 'deniz.aydin@fraudcell.com' },
  { label: 'Süpervizör', email: 'nil.arslan@fraudcell.com' },
  { label: 'Yönetici', email: 'kaan.ozturk@fraudcell.com' },
];

const DEMO_PASSWORD = 'Analist!2026';

/** Personel girişi: e-posta + şifre. 5 hatalı denemede hesap 15 dakika kilitlenir. */
export function StaffLogin() {
  const navigate = useNavigate();
  const signIn = useAuth((state) => state.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setRemaining(null);
    try {
      const result = await authApi.loginStaff(email, password);
      signIn(result.accessToken, result.user);
      navigate(homePathFor(result.user.role), { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setLocked(caught.status === 423);
        const left = caught.details?.['remainingAttempts'];
        setRemaining(typeof left === 'number' ? left : null);
      } else {
        setError('Giriş yapılamadı.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="safe-top flex h-14 items-center px-2">
        <button
          type="button"
          onClick={() => navigate('/giris')}
          aria-label="Geri"
          className="rounded-full p-2 text-ink-700 transition-colors hover:bg-ink-100"
        >
          <ChevronLeft className="size-6" />
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <div className="mt-6 mb-8">
          <LogoWordmark />
          <h1 className="mt-6 text-2xl font-bold text-ink-900">Personel Girişi</h1>
          <p className="mt-2 text-[15px] text-ink-500">
            Analist, süpervizör ve yönetici hesapları için.
          </p>
        </div>

        {locked && (
          <Banner tone="danger" className="mb-4">
            <span className="font-semibold">Hesap kilitli.</span> Güvenlik nedeniyle 5 başarısız
            denemeden sonra hesap 15 dakika kilitlenir.
          </Banner>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field
            label="E-posta"
            type="email"
            autoComplete="username"
            placeholder="ad.soyad@fraudcell.com"
            leadingIcon={<Mail className="size-5" />}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            {...(error && !locked ? { error } : {})}
          />

          <PasswordField
            label="Şifre"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            {...(remaining !== null ? { hint: `${remaining} deneme hakkın kaldı.` } : {})}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            className="!mt-6"
            loading={submitting}
            disabled={!email || !password}
          >
            Giriş Yap
          </Button>
        </form>

        {import.meta.env.VITE_API_MODE !== 'live' && (
          <div className="mt-10">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-500">
              <ShieldAlert className="size-4" />
              Demo hesapları
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="rounded-tile border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-600 hover:text-brand-700"
                >
                  {account.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Şifre: <span className="tabular">{DEMO_PASSWORD}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
