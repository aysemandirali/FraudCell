import { Link } from '@tanstack/react-router';
import { ArrowRight, BriefcaseBusiness, UserPlus, UserRound } from 'lucide-react';
import { AuthScaffold } from './AuthScaffold';

const optionClass = [
  'group flex items-center gap-4 rounded-card border border-ink-200 bg-white p-4',
  'text-left shadow-card transition-[border-color,box-shadow,transform]',
  'hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-raised',
].join(' ');

export function AuthLandingPage({ redirectTo }: { redirectTo?: string }) {
  return (
    <AuthScaffold>
      <section className="w-full max-w-md" aria-labelledby="auth-title">
        <div className="mb-8">
          <h1 id="auth-title" className="text-display text-ink-900">
            Hoş geldin
          </h1>
          <p className="mt-2 text-body text-ink-500">Devam etmek için hesap türünü seç.</p>
        </div>

        <div className="grid gap-3">
          <Link
            to="/auth/otp"
            search={{ mode: 'login', redirect: redirectTo }}
            className={optionClass}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-brand-100 text-brand-700">
              <UserRound className="size-6" aria-hidden />
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
            <span className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-success-100 text-success-700">
              <UserPlus className="size-6" aria-hidden />
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

          <div className="my-1 flex items-center gap-3 text-caption text-ink-400">
            <span className="h-px flex-1 bg-ink-200" />
            personel
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <Link to="/auth/staff" search={{ redirect: redirectTo }} className={optionClass}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-tc-100 text-warning-700">
              <BriefcaseBusiness className="size-6" aria-hidden />
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
