import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button, OtpInput } from '@/components/ui';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { maskMsisdn } from '@/lib/format';
import { homePathFor, useAuth } from '@/stores/auth';

interface OtpLocationState {
  challengeId: string;
  msisdn: string;
  expiresInSeconds: number;
}

/** SMS doğrulama adımı. Kod dolunca otomatik gönderilir. */
export function OtpStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useAuth((state) => state.signIn);

  const state = location.state as OtpLocationState | null;

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(state?.expiresInSeconds ?? 180);
  const [challengeId, setChallengeId] = useState(state?.challengeId ?? '');

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const verify = useCallback(
    async (value: string) => {
      if (submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const result = await authApi.verifyOtp(challengeId, value);
        signIn(result.accessToken, result.user);
        navigate(homePathFor(result.user.role), { replace: true });
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Doğrulama başarısız.');
        setCode('');
      } finally {
        setSubmitting(false);
      }
    },
    [challengeId, navigate, signIn, submitting],
  );

  async function resend() {
    if (!state) return;
    setError(null);
    setCode('');
    try {
      const next = await authApi.requestOtp(state.msisdn);
      setChallengeId(next.challengeId);
      setSecondsLeft(next.expiresInSeconds);
    } catch {
      setError('Kod yeniden gönderilemedi.');
    }
  }

  // Doğrudan URL ile gelinirse akışın başına dön.
  if (!state) return <Navigate to="/giris/telefon" replace />;

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="safe-top flex h-14 items-center px-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Geri"
          className="rounded-full p-2 text-ink-700 transition-colors hover:bg-ink-100"
        >
          <ChevronLeft className="size-6" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold text-ink-900">
          Telefonunu Doğrula
        </h1>
        <span className="w-10" aria-hidden />
      </header>

      <div className="flex flex-1 flex-col px-6 pt-8">
        <p className="text-[15px] leading-relaxed text-ink-700">
          <span className="font-semibold text-ink-900">{maskMsisdn(state.msisdn)}</span> numarasına
          gönderdiğimiz 6 haneli kodu gir.
        </p>

        <div className="mt-8">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={submitting}
            error={Boolean(error)}
            autoFocus
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-danger-500">
            {error}
          </p>
        )}

        <div className="mt-6 text-center">
          {secondsLeft > 0 ? (
            <p className="text-sm text-ink-400 tabular">
              Yeni kod için {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </p>
          ) : (
            <button
              type="button"
              onClick={resend}
              className="text-sm font-semibold text-brand-700 underline underline-offset-4"
            >
              Kodu yeniden gönder
            </button>
          )}
        </div>

        {/* Demo kolaylığı: mock backend sabit kod üretir. */}
        {import.meta.env.VITE_API_MODE !== 'live' && (
          <p className="mt-8 rounded-tile bg-brand-50 px-4 py-3 text-center text-sm text-brand-800">
            Demo kodu: <span className="font-bold tabular">142536</span>
          </p>
        )}
      </div>

      <div className="safe-bottom px-6 pb-6">
        <Button
          size="lg"
          fullWidth
          disabled={code.length !== 6}
          loading={submitting}
          onClick={() => verify(code)}
        >
          Doğrula ve Giriş Yap
        </Button>
      </div>
    </div>
  );
}
