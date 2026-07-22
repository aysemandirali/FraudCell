import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button, Field } from '@/components/ui';
import { LogoMark } from '@/components/brand/Logo';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { formatMsisdn } from '@/lib/format';

/** Telefon numarası adımı — tasarımdaki "5XX XXX XX XX" ekranı. */
export function PhoneStep() {
  const navigate = useNavigate();
  const [msisdn, setMsisdn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const digits = msisdn.replace(/\D/g, '');
  const isValid = digits.length === 10 && digits.startsWith('5');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const { challengeId, expiresInSeconds } = await authApi.requestOtp(digits);
      navigate('/giris/dogrulama', { state: { challengeId, msisdn: digits, expiresInSeconds } });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Kod gönderilemedi. Tekrar dene.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="gradient-splash flex min-h-dvh flex-col px-6 text-white">
      <header className="safe-top pt-3">
        <button
          type="button"
          onClick={() => navigate('/giris')}
          aria-label="Geri"
          className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <ChevronLeft className="size-6" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center justify-center">
          <LogoMark className="size-20 text-white drop-shadow-lg" />
          <h1 className="mt-5 mb-8 text-[26px] font-bold">FraudCell'e Hoş Geldin!</h1>

          <div className="w-full max-w-sm">
            <Field
              label="Telefon Numarası"
              placeholder="5XX XXX XX XX"
              inputMode="numeric"
              autoComplete="tel-national"
              autoFocus
              onBrand
              value={msisdn}
              onChange={(event) => setMsisdn(formatMsisdn(event.target.value))}
              {...(error ? { error } : {})}
            />
          </div>
        </div>

        <div className="safe-bottom mx-auto w-full max-w-sm pb-6">
          <Button type="submit" size="lg" fullWidth disabled={!isValid} loading={submitting}>
            Devam Et
          </Button>
          <p className="mt-4 text-center text-xs leading-relaxed text-white/70">
            Devam ederek TÖHAŞ Çerçeve Ödeme Hizmeti Sözleşmesi'ni ve Uygulama Kullanım
            Sözleşmesi'ni kabul etmiş olursun.
          </p>
        </div>
      </form>
    </div>
  );
}
