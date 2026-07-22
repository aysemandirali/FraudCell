import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { LogoMark } from '@/components/brand/Logo';
import { homePathFor, useAuth } from '@/stores/auth';

/**
 * Karşılama ekranı — tasarımdaki "Paycell'e Hoş Geldin!" sayfası.
 * Tam sayfa gradient, ortada logo, altta beyaz pill buton.
 */
export function Welcome() {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);

  // Oturum açıkken karşılama ekranı gösterilmez.
  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <div className="gradient-splash flex min-h-dvh flex-col px-6 text-white">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <LogoMark className="size-24 text-white drop-shadow-lg" />

        <h1 className="mt-6 text-[28px] leading-tight font-bold">FraudCell'e Hoş Geldin!</h1>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-white/85">
          Paycell işlemlerin yapay zekâ ile anlık olarak korunuyor.
        </p>

        <Button
          variant="onBrand"
          size="lg"
          fullWidth
          className="mt-10 max-w-sm"
          onClick={() => navigate('/giris/telefon')}
        >
          Giriş Yap
        </Button>

        <Link
          to="/giris/personel"
          className="mt-6 text-[15px] font-semibold text-white underline underline-offset-4"
        >
          FraudCell ekibi misin? Personel girişi
        </Link>
      </div>

      <footer className="safe-bottom pb-6 text-center text-xs text-white/60">
        Turkcell Ödeme ve Elektronik Para Hizmetleri A.Ş. · CodeNight 2026
      </footer>
    </div>
  );
}
