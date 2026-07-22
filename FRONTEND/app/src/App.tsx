import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/routes/RequireAuth';
import { MobileShell } from '@/routes/shells/MobileShell';
import { ConsoleShell } from '@/routes/shells/ConsoleShell';
import { RouteFallback } from '@/routes/RouteFallback';
import { useAuth, homePathFor } from '@/stores/auth';

/* Giriş akışı ilk boyamada gerektiği için eager, geri kalanı lazy yüklenir. */
import { Welcome } from '@/routes/auth/Welcome';
import { PhoneStep } from '@/routes/auth/PhoneStep';
import { OtpStep } from '@/routes/auth/OtpStep';
import { StaffLogin } from '@/routes/auth/StaffLogin';

const Home = lazy(() => import('@/routes/customer/Home'));
const Transactions = lazy(() => import('@/routes/customer/Transactions'));
const NewTransaction = lazy(() => import('@/routes/customer/NewTransaction'));
const TransactionDetail = lazy(() => import('@/routes/customer/TransactionDetail'));
const Security = lazy(() => import('@/routes/customer/Security'));
const Profile = lazy(() => import('@/routes/customer/Profile'));
const Notifications = lazy(() => import('@/routes/customer/Notifications'));

const CaseQueue = lazy(() => import('@/routes/console/CaseQueue'));
const CaseDetail = lazy(() => import('@/routes/console/CaseDetail'));
const MyPoints = lazy(() => import('@/routes/console/MyPoints'));
const Leaderboard = lazy(() => import('@/routes/console/Leaderboard'));
const Supervisor = lazy(() => import('@/routes/console/Supervisor'));
const Administration = lazy(() => import('@/routes/console/Administration'));

const DemoControl = lazy(() => import('@/routes/DemoControl'));
const DesignSystem = lazy(() => import('@/routes/DesignSystem'));

export function App() {
  const hydrating = useAuth((state) => state.hydrating);
  const role = useAuth((state) => state.user?.role ?? null);

  // Oturum sessionStorage'dan geri yüklenirken yönlendirme yapma —
  // aksi hâlde giriş yapmış kullanıcı bir an giriş ekranına düşer.
  if (hydrating) return <RouteFallback />;

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ------------------------------------------------ Giriş akışı -- */}
        <Route path="/giris" element={<Welcome />} />
        <Route path="/giris/telefon" element={<PhoneStep />} />
        <Route path="/giris/dogrulama" element={<OtpStep />} />
        <Route path="/giris/personel" element={<StaffLogin />} />

        {/* ------------------------------------------ Müşteri uygulaması -- */}
        <Route
          element={
            <RequireAuth allow={['MUSTERI']}>
              <MobileShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/islemlerim" element={<Transactions />} />
          <Route path="/guvenlik" element={<Security />} />
          <Route path="/profil" element={<Profile />} />
        </Route>

        {/* Alt gezinme çubuğu olmayan müşteri sayfaları (tam ekran akışlar). */}
        <Route
          element={
            <RequireAuth allow={['MUSTERI']}>
              <MobileShell chrome={false} />
            </RequireAuth>
          }
        >
          <Route path="/yeni-islem" element={<NewTransaction />} />
          <Route path="/islem/:id" element={<TransactionDetail />} />
          <Route path="/bildirimler" element={<Notifications />} />
        </Route>

        {/* -------------------------------------------- Personel konsolu -- */}
        <Route
          element={
            <RequireAuth allow={['ANALYST', 'SUPERVISOR', 'ADMIN']}>
              <ConsoleShell />
            </RequireAuth>
          }
        >
          <Route path="/konsol" element={<CaseQueue />} />
          <Route path="/konsol/vaka/:id" element={<CaseDetail />} />
          <Route path="/konsol/puanlarim" element={<MyPoints />} />
          <Route path="/konsol/liderlik" element={<Leaderboard />} />
          <Route
            path="/konsol/supervizor"
            element={
              <RequireAuth allow={['SUPERVISOR', 'ADMIN']}>
                <Supervisor />
              </RequireAuth>
            }
          />
          <Route
            path="/konsol/yonetim"
            element={
              <RequireAuth allow={['ADMIN', 'SUPERVISOR']}>
                <Administration />
              </RequireAuth>
            }
          />
        </Route>

        {/* --------------------------------------------------- Yardımcı -- */}
        <Route path="/demo" element={<DemoControl />} />
        <Route path="/design-system" element={<DesignSystem />} />

        <Route path="*" element={<Navigate to={homePathFor(role)} replace />} />
      </Routes>
    </Suspense>
  );
}
