/**
 * Backend yollarının tek kaydı.
 *
 * OpenAPI'den tip üretemediğimiz için (contracts/api boş) yolları elle
 * yazıyoruz. Elle yazılan yolların en büyük riski sessiz drift'tir; bu yüzden
 * hepsi TEK dosyada toplanır ve feature'lar string literal yazmaz.
 *
 * `API_PREFIX` client tarafında eklenir — buradaki yollar prefix'siz.
 * Tümü BACKEND'deki `Map{Get,Post,Put,Patch,Delete}("/api/v1/...")` çağrılarıyla
 * birebir doğrulanmıştır.
 */

export const endpoints = {
  /* ---------------------------------------------------------------- auth -- */
  auth: {
    /** POST — müşteri OTP isteği. */
    otpChallenges: '/auth/customer/otp/challenges',
    /** POST — OTP doğrulama. Yeni numarada müşteri bilgisi de bu gövdede gider. */
    otpVerifications: '/auth/customer/otp/verifications',
    /** POST — personel e-posta + şifre girişi. */
    staffLogin: '/auth/staff/login',
    /** POST — refresh cookie'siyle yeni access token. */
    refresh: '/auth/refresh',
    /** POST — oturumu kapatır, refresh cookie'sini siler. */
    logout: '/auth/logout',
    /** GET — oturumdaki kullanıcı. */
    me: '/auth/me',
    /** GET — aktif cihaz oturumları. DELETE — hepsini kapat. */
    sessions: '/auth/sessions',
    /** DELETE — tek oturumu kapat. */
    session: (sessionId: string) => `/auth/sessions/${sessionId}`,
  },

  /* --------------------------------------------------------------- staff -- */
  staff: {
    /** GET (liste) / POST (oluştur) — ADMIN. */
    root: '/staff',
    /** GET (tek) / PATCH (kısmi güncelle) — `If-Match` gerekir. */
    byId: (staffId: string) => `/staff/${staffId}`,
    /** PUT — `If-Match` gerekir. */
    role: (staffId: string) => `/staff/${staffId}/role`,
    specialties: (staffId: string) => `/staff/${staffId}/specialties`,
    regions: (staffId: string) => `/staff/${staffId}/regions`,
  },

  /* ----------------------------------------------------------- referans -- */
  reference: {
    roles: '/reference/roles',
    specialties: '/reference/specialties',
    regions: '/reference/regions',
  },

  /* ------------------------------------------------------------- denetim -- */
  audit: {
    /** GET — ADMIN. Cursor pagination. */
    logs: '/audit-logs',
    byId: (auditId: string) => `/audit-logs/${auditId}`,
  },

  /* ------------------------------------------------------------ işlemler -- */
  transactions: {
    /** GET (liste) / POST (oluştur — `Idempotency-Key` ZORUNLU). */
    root: '/transactions',
    byId: (transactionId: string) => `/transactions/${transactionId}`,
  },

  /* -------------------------------------------------------------- vaka -- */
  cases: {
    /** GET — SUPERVISOR/ADMIN, tüm vakalar. */
    root: '/cases',
    /** GET — ANALYST, yalnızca kendine atanmışlar. */
    assigned: '/cases/assigned',
    /** GET — SUPERVISOR/ADMIN, atama bekleyenler. */
    assignmentQueue: '/cases/assignment-queue',

    byId: (caseId: string) => `/cases/${caseId}`,
    /** GET — durum geçişleri. Vaka gövdesinde GELMEZ. */
    history: (caseId: string) => `/cases/${caseId}/history`,
    /** GET (liste) / POST (ekle). Vaka gövdesinde GELMEZ. */
    notes: (caseId: string) => `/cases/${caseId}/notes`,

    /** POST — ATANDI → INCELENIYOR. */
    review: (caseId: string) => `/cases/${caseId}/review`,
    /** PATCH — INCELENIYOR → ONAYLANDI | BLOKLANDI. `If-Match` gerekir. */
    decision: (caseId: string) => `/cases/${caseId}/decision`,

    /** POST — analist müşteriden doğrulama ister. */
    verificationRequests: (caseId: string) => `/cases/${caseId}/verification-requests`,
    /** POST — müşteri yanıtlar. DİKKAT: çoğul. */
    verificationResponses: (caseId: string) => `/cases/${caseId}/verification-responses`,

    /** PUT — süpervizör manuel ataması. `If-Match` gerekir. */
    assignment: (caseId: string) => `/cases/${caseId}/assignment`,
    /** POST — başka analiste devir. */
    reassignments: (caseId: string) => `/cases/${caseId}/reassignments`,

    /** PATCH — süpervizör AI'ın fraud tipini değiştirir. `If-Match` gerekir. */
    fraudType: (caseId: string) => `/cases/${caseId}/fraud-type`,
    /** PATCH — risk seviyesi override; SLA yeniden hesaplanır. `If-Match` gerekir. */
    riskLevel: (caseId: string) => `/cases/${caseId}/risk-level`,

    /** POST — vaka kapandıktan sonra müşteri geri bildirimi. */
    feedback: (caseId: string) => `/cases/${caseId}/feedback`,
  },

  /* ------------------------------------------------------------- müşteri -- */
  customer: {
    /** GET — müşterinin cevap bekleyen doğrulama istekleri. */
    pendingVerifications: '/customer/verifications/pending',
  },
} as const;

/**
 * ⚠️ Backend'i HENÜZ YAZILMAMIŞ uçlar — yalnızca MSW karşılar.
 *
 * `endpoints` ile aynı nesnede tutulmaz ki gerçek sözleşme ile varsayım
 * karışmasın. Servis yazıldığında buradan `endpoints`e taşınır.
 */
export const pendingEndpoints = {
  gamification: {
    me: '/gamification/me',
    points: '/gamification/me/points',
    badges: '/gamification/me/badges',
    leaderboard: '/gamification/leaderboard',
  },
  notifications: {
    root: '/notifications',
    read: (notificationId: string) => `/notifications/${notificationId}/read`,
    readAll: '/notifications/read-all',
  },
  dashboard: {
    root: '/dashboard',
  },
  ai: {
    metrics: '/ai/metrics',
  },
  system: {
    health: '/system/health',
    /** Demo kontrol paneli: servis durdur/başlat. Üretimde bulunmaz. */
    setHealth: (service: string) => `/system/health/${service}`,
  },
} as const;
