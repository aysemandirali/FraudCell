import { Link } from '@tanstack/react-router';
import { ArrowRight, BriefcaseBusiness, UserPlus, UserRound } from 'lucide-react';
import { AuthScaffold } from './AuthScaffold';

const optionClass = [
  'group relative flex items-center gap-3.5 overflow-hidden rounded-card border border-white/80 bg-white/90 p-3.5 sm:gap-4 sm:p-4.5',
  'text-left shadow-card backdrop-blur-md transition-[border-color,box-shadow,transform]',
  'before:absolute before:inset-y-0 before:left-0 before:w-1 before:scale-y-0 before:bg-tc-500 before:transition-transform',
  'hover:-translate-y-1 hover:border-brand-200 hover:shadow-raised hover:before:scale-y-100',
].join(' ');

export function AuthLandingPage({ redirectTo }: { redirectTo?: string }) {
  return (
    <AuthScaffold>
      <section className="w-full max-w-[29rem]" aria-labelledby="auth-title">
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-pill bg-brand-50 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-brand-700 uppercase ring-1 ring-brand-100">
            <span className="size-1.5 rounded-full bg-tc-500" />
            Güvenli erişim
          </div>
          <h1 id="auth-title" className="text-[clamp(2rem,9vw,2.5rem)] leading-[1.12] font-bold tracking-[-0.025em] text-brand-950">
            Hoş geldin
          </h1>
          <p className="mt-2 max-w-sm text-body text-ink-500">Sana uygun güvenli giriş kanalını seçerek devam et.</p>
        </div>

        <div className="grid gap-3">
          <Link
            to="/auth/otp"
            search={{ mode: 'login', redirect: redirectTo }}
            className={optionClass}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-brand-100 text-brand-800 ring-1 ring-brand-200/70 sm:size-12">
              <UserRound className="size-5.5 sm:size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900">Müşteri girişi</span>
              <span className="mt-0.5 block text-sm text-ink-500">Telefon ve tek kullanımlık kod</span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>

          <Link
            to="/auth/otp"
            search={{ mode: 'register', redirect: redirectTo }}
            className={optionClass}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-aqua-100 text-aqua-700 ring-1 ring-aqua-300/40 sm:size-12">
              <UserPlus className="size-5.5 sm:size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900">Yeni müşteri</span>
              <span className="mt-0.5 block text-sm text-ink-500">Telefon numarasıyla kayıt</span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>

          <div className="my-2 flex items-center gap-3 text-[10px] font-bold tracking-[0.15em] text-ink-400 uppercase">
            <span className="h-px flex-1 bg-ink-200" />
            Operasyon ekibi
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <Link to="/auth/staff" search={{ redirect: redirectTo }} className={optionClass}>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-tc-100 text-brand-900 ring-1 ring-tc-400/60 sm:size-12">
              <BriefcaseBusiness className="size-5.5 sm:size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900">Personel girişi</span>
              <span className="mt-0.5 block text-sm text-ink-500">Analist, süpervizör ve yönetici</span>
            </span>
            <ArrowRight
              className="size-5 shrink-0 text-ink-400 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>
      </section>
    </AuthScaffold>
  );
}
