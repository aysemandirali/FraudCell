import { http, HttpResponse, delay } from 'msw';
import {
  addNote,
  applyCustomerResponse,
  badgesFor,
  createOtpChallenge,
  createTransaction,
  db,
  decideCase,
  findUserByEmail,
  findUserById,
  findUserByMsisdn,
  rankCandidates,
  scheduleAssessment,
  serviceStatus,
  setServiceStatus,
  transition,
  ulid,
  type MockUser,
} from './db';
import { canTransition } from '@/domain/stateMachine';
import type {
  AnalystScore,
  ApiFailure,
  ApiSuccess,
  CaseStatus,
  LeaderboardEntry,
  Paged,
  RiskCase,
} from '@/domain/types';

const BASE = '/api/v1';

/* ============================================================ Zarflar == */

/**
 * msw v2'de HttpResponse generic bir sınıftır ve HttpResponse.json() StrictResponse
 * döner. Yardımcıları düz `Response` ile tiplemek hem doğru hem de tip daralmasının
 * (isResponse) çalışmasını sağlar — HttpResponse ve StrictResponse ikisi de Response'tur.
 */
function ok<T>(data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data, error: null, meta: { traceId: ulid() } };
  return HttpResponse.json(body, { status });
}

function fail(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  const body: ApiFailure = {
    success: false,
    data: null,
    error: { code, message, ...(details ? { details } : {}) },
    meta: { traceId: ulid() },
  };
  return HttpResponse.json(body, { status });
}

function page<T>(items: T[], pageNumber = 1, pageSize = 20): Paged<T> {
  const start = (pageNumber - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: pageNumber,
    pageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/* ======================================================== Kimlik doğrulama == */

/** Demo token'ı: "mock.<userId>". Gerçek sistemde RSA imzalı JWT olur. */
function issueToken(user: MockUser): string {
  return `mock.${user.id}`;
}

function currentUser(request: Request): MockUser | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer mock.')) return null;
  return findUserById(header.slice('Bearer mock.'.length)) ?? null;
}

/** Kimliği doğrulanmış kullanıcıyı ya da 401 yanıtını döner. */
function requireUser(request: Request): MockUser | Response {
  const user = currentUser(request);
  if (!user) return fail(401, 'UNAUTHENTICATED', 'Bu işlem için giriş yapmalısın.');
  return user;
}

function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

/**
 * Kaynak sahipliği doğrulanamadığında kaynağın varlığını sızdırmamak için
 * 403 yerine 404 döneriz (doküman §7 — IDOR).
 */
function notFound(): Response {
  return fail(404, 'RESOURCE_NOT_FOUND', 'Kayıt bulunamadı.');
}

/** İlgili servis kapalıysa 503 döner — arayüz degraded modunu gösterir. */
function guardService(name: string): Response | null {
  if (serviceStatus(name) === 'DOWN') {
    return fail(
      503,
      'SERVICE_UNAVAILABLE',
      `${name} servisi şu anda kapalı. İşlemin kaybolmadı, servis döndüğünde tamamlanacak.`,
    );
  }
  return null;
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60_000;

/* =============================================================== Handlers == */

export const handlers = [
  /* ------------------------------------------------------------- Auth -- */

  http.post(`${BASE}/auth/otp/request`, async ({ request }) => {
    await delay(400);
    const down = guardService('identity');
    if (down) return down;

    const { msisdn } = (await request.json()) as { msisdn: string };
    const digits = msisdn.replace(/\D/g, '');

    if (digits.length !== 10 || !digits.startsWith('5')) {
      return fail(400, 'INVALID_MSISDN', 'Geçerli bir cep telefonu numarası gir.');
    }
    if (!findUserByMsisdn(digits)) {
      // Numara kayıtlı değilse de aynı yanıt döner — numara sızdırmayız.
      const challenge = createOtpChallenge(digits);
      return ok({ challengeId: challenge.challengeId, expiresInSeconds: 180 });
    }

    const challenge = createOtpChallenge(digits);
    return ok({ challengeId: challenge.challengeId, expiresInSeconds: 180 });
  }),

  http.post(`${BASE}/auth/otp/verify`, async ({ request }) => {
    await delay(500);
    const { challengeId, code } = (await request.json()) as {
      challengeId: string;
      code: string;
    };

    const challenge = db.otpChallenges.get(challengeId);
    if (!challenge) return fail(400, 'INVALID_CHALLENGE', 'Doğrulama oturumu bulunamadı.');
    if (Date.now() > challenge.expiresAt) {
      return fail(400, 'OTP_EXPIRED', 'Kodun süresi doldu. Yeni kod iste.');
    }
    if (code !== challenge.code) {
      return fail(400, 'OTP_INVALID', 'Kod hatalı. Tekrar dene.');
    }

    const user = findUserByMsisdn(challenge.msisdn);
    if (!user) return fail(404, 'USER_NOT_FOUND', 'Bu numaraya ait kayıt bulunamadı.');

    db.otpChallenges.delete(challengeId);
    return ok({ accessToken: issueToken(user), user: publicUser(user) });
  }),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(500);
    const down = guardService('identity');
    if (down) return down;

    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = findUserByEmail(email);

    // Kullanıcı yoksa da kilit mesajı vermeyiz — hesap varlığı sızmasın.
    if (!user || !user.password) {
      return fail(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }

    if (user.lockedUntil && Date.now() < user.lockedUntil) {
      const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60_000);
      return fail(
        423,
        'ACCOUNT_LOCKED',
        `Çok fazla başarısız deneme. Hesabın ${minutes} dakika daha kilitli.`,
      );
    }

    if (user.password !== password) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= LOCKOUT_THRESHOLD) {
        user.lockedUntil = Date.now() + LOCKOUT_MS;
        user.failedAttempts = 0;
        return fail(
          423,
          'ACCOUNT_LOCKED',
          '5 başarısız deneme nedeniyle hesabın 15 dakika kilitlendi.',
        );
      }
      return fail(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.', {
        remainingAttempts: LOCKOUT_THRESHOLD - user.failedAttempts,
      });
    }

    user.failedAttempts = 0;
    user.lockedUntil = null;
    return ok({ accessToken: issueToken(user), user: publicUser(user) });
  }),

  http.post(`${BASE}/auth/refresh`, async () => {
    await delay(200);
    return fail(401, 'REFRESH_UNAVAILABLE', 'Oturum yenilenemedi.');
  }),

  http.post(`${BASE}/auth/logout`, async () => {
    await delay(150);
    return ok(null);
  }),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    return ok(publicUser(user));
  }),

  /* ------------------------------------------------------- İşlemler -- */

  http.post(`${BASE}/transactions`, async ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const down = guardService('transaction');
    if (down) return down;

    await delay(600);
    const input = (await request.json()) as {
      amount: number;
      transactionType: Parameters<typeof createTransaction>[0]['transactionType'];
      recipient: string;
      city: string;
      country: string;
      sourceDevice: string;
    };

    if (!input.amount || input.amount <= 0) {
      return fail(400, 'INVALID_AMOUNT', 'Tutar sıfırdan büyük olmalı.');
    }
    if (!input.recipient?.trim()) {
      return fail(400, 'INVALID_RECIPIENT', 'Alıcı bilgisi zorunlu.');
    }

    const transaction = createTransaction(input);
    // Değerlendirme asenkron: 201 hemen döner, sonuç SSE ile gelir.
    scheduleAssessment(transaction.id);

    return ok(transaction, 201);
  }),

  http.get(`${BASE}/transactions`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLocaleLowerCase('tr-TR') ?? '';

    const items = db.transactions.filter((transaction) => {
      if (!search) return true;
      return (
        transaction.transactionNo.toLocaleLowerCase('tr-TR').includes(search) ||
        transaction.recipient.toLocaleLowerCase('tr-TR').includes(search)
      );
    });

    return ok(page(items, Number(url.searchParams.get('page') ?? 1)));
  }),

  http.get(`${BASE}/transactions/:id`, ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const transaction = db.transactions.find((t) => t.id === params['id']);
    if (!transaction) return notFound();
    return ok(transaction);
  }),

  http.get(`${BASE}/transactions/:id/assessment`, ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const assessment = db.assessments.get(params['id'] as string);
    // Değerlendirme henüz yapılmadıysa 404 — arayüz PENDING durumunu gösterir.
    if (!assessment) return notFound();
    return ok(assessment);
  }),

  /* ----------------------------------------------------- Risk vakaları -- */

  http.get(`${BASE}/cases`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const assignee = url.searchParams.get('assignee');
    const sort = url.searchParams.get('sort');
    const search = url.searchParams.get('search')?.toLocaleLowerCase('tr-TR') ?? '';

    let items = [...db.cases];

    // Müşteri yalnızca kendi vakalarını görür; analist filtresi opsiyoneldir.
    if (assignee === 'me' && user.role === 'ANALYST') {
      items = items.filter((riskCase) => riskCase.assignedAnalystId === user.id);
    } else if (assignee && assignee !== 'me' && assignee !== 'all') {
      items = items.filter((riskCase) => riskCase.assignedAnalystId === assignee);
    }

    if (status && status !== 'ALL') {
      items = items.filter((riskCase) => riskCase.status === status);
    }

    if (search) {
      items = items.filter(
        (riskCase) =>
          riskCase.caseNo.toLocaleLowerCase('tr-TR').includes(search) ||
          riskCase.transaction.transactionNo.toLocaleLowerCase('tr-TR').includes(search) ||
          riskCase.transaction.recipient.toLocaleLowerCase('tr-TR').includes(search),
      );
    }

    items.sort((a, b) => {
      if (sort === 'risk') return (b.riskScore ?? 0) - (a.riskScore ?? 0);
      if (sort === 'sla') {
        // SLA'sı olan vakalar önce, en yakın bitiş en üstte.
        const aDue = a.slaDueAt ? new Date(a.slaDueAt).getTime() : Infinity;
        const bDue = b.slaDueAt ? new Date(b.slaDueAt).getTime() : Infinity;
        return aDue - bDue;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return ok(page(items, Number(url.searchParams.get('page') ?? 1)));
  }),

  http.get(`${BASE}/cases/:id`, ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();
    // Analist başkasının vakasını isterse varlığını sızdırmadan 404.
    if (user.role === 'ANALYST' && riskCase.assignedAnalystId !== user.id) return notFound();

    return ok(riskCase);
  }),

  http.get(`${BASE}/cases/:id/assignment-candidates`, ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
      return fail(403, 'FORBIDDEN', 'Bu işlem için süpervizör yetkisi gerekir.');
    }

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();
    return ok(rankCandidates(riskCase));
  }),

  http.post(`${BASE}/cases/:id/review`, async ({ request, params }) => {
    const guard = await guardCaseAction(request, params['id'] as string, 'INCELENIYOR');
    if (isResponse(guard)) return guard;

    transition(guard.riskCase, 'INCELENIYOR', guard.user.id, guard.user.fullName);
    return ok(guard.riskCase);
  }),

  http.post(`${BASE}/cases/:id/verification-requests`, async ({ request, params }) => {
    const body = (await request.clone().json()) as { question: string; version: number };
    const guard = await guardCaseAction(request, params['id'] as string, 'MUSTERI_DOGRULAMA');
    if (isResponse(guard)) return guard;

    if (!body.question?.trim()) {
      return fail(400, 'QUESTION_REQUIRED', 'Müşteriye sorulacak soru boş olamaz.');
    }

    guard.riskCase.verificationRequests.push({
      id: ulid(),
      question: body.question.trim(),
      requestedAt: new Date().toISOString(),
      respondedAt: null,
      response: null,
    });
    transition(guard.riskCase, 'MUSTERI_DOGRULAMA', guard.user.id, guard.user.fullName);
    return ok(guard.riskCase);
  }),

  http.post(`${BASE}/cases/:id/verification-response`, async ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();

    if (riskCase.status !== 'MUSTERI_DOGRULAMA') {
      return fail(
        422,
        'INVALID_CASE_TRANSITION',
        'Bu vaka şu anda müşteri doğrulaması beklemiyor.',
      );
    }

    const { response } = (await request.json()) as { response: 'MINE' | 'NOT_MINE' };
    await delay(400);
    applyCustomerResponse(riskCase, response);
    return ok(riskCase);
  }),

  http.patch(`${BASE}/cases/:id/decision`, async ({ request, params }) => {
    const body = (await request.clone().json()) as {
      decision: 'ONAYLANDI' | 'BLOKLANDI';
      note: string;
      version: number;
    };
    const guard = await guardCaseAction(request, params['id'] as string, body.decision);
    if (isResponse(guard)) return guard;

    await delay(500);
    decideCase(guard.riskCase, body.decision, body.note ?? '', guard.user);
    return ok(guard.riskCase);
  }),

  http.put(`${BASE}/cases/:id/assignment`, async ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
      return fail(403, 'FORBIDDEN', 'Manuel atama için süpervizör yetkisi gerekir.');
    }

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();

    const { analystId, version } = (await request.json()) as {
      analystId: string;
      version: number;
    };
    if (version !== riskCase.version) return versionConflict(riskCase);

    const analystUser = findUserById(analystId);
    if (!analystUser || analystUser.role !== 'ANALYST') {
      return fail(400, 'INVALID_ANALYST', 'Seçilen analist bulunamadı.');
    }
    if (analystUser.activeCases >= 10) {
      return fail(422, 'ANALYST_AT_CAPACITY', `${analystUser.fullName} kapasitesi dolu (10/10).`);
    }

    // Önceki analistin kapasitesini serbest bırak.
    const previous = findUserById(riskCase.assignedAnalystId ?? '');
    if (previous) previous.activeCases = Math.max(0, previous.activeCases - 1);

    analystUser.activeCases += 1;
    riskCase.assignedAnalystId = analystUser.id;
    riskCase.assignedAnalystName = analystUser.fullName;
    riskCase.assignmentStatus = 'ASSIGNED';

    if (riskCase.status === 'YENI') {
      transition(riskCase, 'ATANDI', user.id, user.fullName, 'Manuel atama');
    } else {
      riskCase.version += 1;
    }

    return ok(riskCase);
  }),

  http.patch(`${BASE}/cases/:id/fraud-type`, async ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    if (user.role !== 'SUPERVISOR' && user.role !== 'ADMIN') {
      return fail(403, 'FORBIDDEN', 'Fraud tipi değişikliği için süpervizör yetkisi gerekir.');
    }

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();

    const { fraudType, reason, version } = (await request.json()) as {
      fraudType: RiskCase['fraudType'];
      reason: string;
      version: number;
    };
    if (version !== riskCase.version) return versionConflict(riskCase);

    riskCase.fraudTypeOverriddenFrom = riskCase.fraudType;
    riskCase.fraudType = fraudType;
    riskCase.version += 1;
    addNote(riskCase, user, `Fraud tipi değiştirildi. Gerekçe: ${reason}`);

    return ok(riskCase);
  }),

  http.post(`${BASE}/cases/:id/notes`, async ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();

    const { body } = (await request.json()) as { body: string };
    if (!body?.trim()) return fail(400, 'NOTE_REQUIRED', 'Not boş olamaz.');
    // Notlar düz metindir; HTML kabul edilmez (doküman §20).
    if (/<[^>]+>/.test(body)) {
      return fail(400, 'HTML_NOT_ALLOWED', 'Notlarda HTML etiketi kullanılamaz.');
    }

    addNote(riskCase, user, body.trim());
    return ok(riskCase);
  }),

  http.post(`${BASE}/cases/:id/feedback`, async ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const riskCase = findCase(params['id'] as string);
    if (!riskCase) return notFound();
    if (riskCase.status !== 'KAPANDI') {
      return fail(422, 'CASE_NOT_CLOSED', 'Geri bildirim yalnızca kapanmış vakalar için verilebilir.');
    }
    await delay(300);
    return ok(null);
  }),

  /* -------------------------------------------------------- Gamification -- */

  http.get(`${BASE}/gamification/me`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const down = guardService('gamification');
    if (down) return down;

    const total = db.points.reduce((sum, entry) => sum + entry.points, 0);
    const dayAgo = Date.now() - 86_400_000;
    const weekAgo = Date.now() - 7 * 86_400_000;

    const score: AnalystScore = {
      analystId: user.id,
      totalPoints: total,
      dailyPoints: sumSince(dayAgo),
      weeklyPoints: sumSince(weekAgo),
      resolvedCases: db.points.filter((entry) => entry.ruleCode === 'CASE_DECISION').length,
      activeCases: user.activeCases,
      capacity: Math.max(0, 1 - user.activeCases / 10),
      accuracy: user.performance,
      dailyRank: 2,
      weeklyRank: 3,
    };
    return ok(score);
  }),

  http.get(`${BASE}/gamification/me/points`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    const url = new URL(request.url);
    return ok(page(db.points, Number(url.searchParams.get('page') ?? 1)));
  }),

  http.get(`${BASE}/gamification/me/badges`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    return ok(badgesFor(user.id));
  }),

  http.get(`${BASE}/gamification/leaderboard`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const myPoints = db.points.reduce((sum, entry) => sum + entry.points, 0);

    const rows: LeaderboardEntry[] = db.users
      .filter((u) => u.role === 'ANALYST')
      .map((u) => ({
        rank: 0,
        analystId: u.id,
        analystName: u.fullName,
        // Oturumdaki analistin puanı canlı ledger'dan, diğerleri türetilir.
        points: u.id === user.id ? myPoints : Math.round(u.performance * 520 + u.activeCases * 17),
        resolvedCases: Math.round(u.performance * 40),
        accuracy: u.performance,
        isCurrentUser: u.id === user.id,
      }))
      .sort((a, b) => b.points - a.points)
      .map((row, index) => ({ ...row, rank: index + 1 }));

    return ok(rows);
  }),

  /* --------------------------------------------------------- Bildirimler -- */

  http.get(`${BASE}/notifications`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    return ok(db.notifications.slice(0, 50));
  }),

  http.post(`${BASE}/notifications/:id/read`, ({ request, params }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    const notification = db.notifications.find((n) => n.id === params['id']);
    if (notification) notification.read = true;
    return ok(null);
  }),

  http.post(`${BASE}/notifications/read-all`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    db.notifications.forEach((notification) => {
      notification.read = true;
    });
    return ok(null);
  }),

  /* --------------------------------------------------------------- Admin -- */

  http.get(`${BASE}/audit`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    if (user.role !== 'ADMIN' && user.role !== 'SUPERVISOR') {
      return fail(403, 'FORBIDDEN', 'Audit kaydı için yönetici yetkisi gerekir.');
    }
    const url = new URL(request.url);
    return ok(page(db.audit, Number(url.searchParams.get('page') ?? 1)));
  }),

  http.get(`${BASE}/admin/analysts`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const analysts = db.users
      .filter((u) => u.role === 'ANALYST' || u.role === 'SUPERVISOR')
      .map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email ?? '',
        specialties: u.specialties,
        regions: u.regions as string[],
        activeCases: u.activeCases,
        accuracy: u.performance,
        locked: Boolean(u.lockedUntil && Date.now() < u.lockedUntil),
      }));

    return ok(analysts);
  }),

  http.post(`${BASE}/admin/staff`, async ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;
    // Personel hesabını yalnızca admin açabilir (ROLE-012).
    if (user.role !== 'ADMIN') {
      return fail(403, 'FORBIDDEN', 'Personel hesabı yalnızca yönetici oluşturabilir.');
    }

    const body = (await request.json()) as {
      fullName: string;
      email: string;
      role: 'ANALYST' | 'SUPERVISOR';
      specialties: MockUser['specialties'];
      regions: MockUser['regions'];
    };

    if (findUserByEmail(body.email)) {
      return fail(409, 'EMAIL_ALREADY_REGISTERED', 'Bu e-posta zaten kayıtlı.');
    }

    // Geçici şifre şifre politikasını sağlar: 8+, büyük harf, rakam, özel karakter.
    const temporaryPassword = `Fc${Math.floor(1000 + Math.random() * 9000)}!ge`;

    const created: MockUser = {
      id: ulid(),
      fullName: body.fullName,
      role: body.role,
      email: body.email,
      specialties: body.specialties,
      regions: body.regions,
      password: temporaryPassword,
      failedAttempts: 0,
      lockedUntil: null,
      activeCases: 0,
      // Yeni analistte veri yok; atama skorunda nötr başlangıç (doküman §13).
      performance: 0.5,
    };
    db.users.push(created);

    db.audit.unshift({
      id: ulid(),
      actorId: user.id,
      actorName: user.fullName,
      action: 'STAFF_CREATED',
      sourceService: 'identity-service',
      resourceType: 'user',
      resourceId: created.id,
      ipAddress: '127.0.0.1',
      result: 'SUCCESS',
      occurredAt: new Date().toISOString(),
      correlationId: ulid(),
      details: { role: created.role, email: created.email },
    });

    return ok({ id: created.id, temporaryPassword }, 201);
  }),

  /* ------------------------------------------------------- AI metrikleri -- */

  http.get(`${BASE}/ai/metrics`, ({ request }) => {
    const user = requireUser(request);
    if (isResponse(user)) return user;

    const down = guardService('ai');
    if (down) return down;

    // Ground truth: analistin nihai kararı ve fraud tipi override'ı.
    const decided = db.cases.filter(
      (item) => item.status === 'ONAYLANDI' || item.status === 'BLOKLANDI',
    );

    const ratio = (numerator: number, denominator: number) =>
      denominator === 0 ? 0 : numerator / denominator;

    const notOverridden = decided.filter((item) => item.fraudTypeOverriddenFrom === null).length;

    const agreed = decided.filter((item) => {
      const aiSaidBlock = item.transaction.decision === 'BLOK';
      return aiSaidBlock ? item.status === 'BLOKLANDI' : item.status === 'ONAYLANDI';
    }).length;

    const aiBlocked = decided.filter((item) => item.transaction.decision === 'BLOK');
    const falsePositives = aiBlocked.filter((item) => item.status === 'ONAYLANDI').length;

    const types = [...new Set(decided.map((item) => item.fraudType).filter(Boolean))];

    return ok({
      overallAccuracy: ratio(notOverridden, decided.length),
      decisionAgreement: ratio(agreed, decided.length),
      falsePositiveRate: ratio(falsePositives, aiBlocked.length),
      totalPredictions: db.assessments.size,
      modelVersion: [...db.assessments.values()][0]?.modelVersion ?? 'risk-1.0.0',
      byFraudType: types.map((type) => {
        const sample = decided.filter((item) => item.fraudType === type);
        const correct = sample.filter((item) => item.fraudTypeOverriddenFrom === null).length;
        return {
          fraudType: type!,
          accuracy: ratio(correct, sample.length),
          sampleSize: sample.length,
        };
      }),
    });
  }),

  /* ------------------------------------------------------- Sistem sağlığı -- */

  http.get(`${BASE}/system/health`, () => ok(db.health)),

  // Demo kontrol paneli: jüri önünde servis kapatıp açmak için.
  http.post(`${BASE}/system/health/:name`, async ({ request, params }) => {
    const { status } = (await request.json()) as { status: 'UP' | 'DOWN' };
    setServiceStatus(params['name'] as string, status);
    return ok(db.health);
  }),
];

/* ============================================================ Yardımcılar == */

function publicUser(user: MockUser) {
  const { password: _password, failedAttempts: _f, lockedUntil: _l, ...rest } = user;
  return rest;
}

function findCase(id: string): RiskCase | undefined {
  return db.cases.find((riskCase) => riskCase.id === id);
}

function sumSince(timestamp: number): number {
  return db.points
    .filter((entry) => new Date(entry.occurredAt).getTime() >= timestamp)
    .reduce((sum, entry) => sum + entry.points, 0);
}

function versionConflict(riskCase: RiskCase): Response {
  return fail(409, 'CONCURRENCY_CONFLICT', 'Bu vaka başka biri tarafından güncellendi. Yenile.', {
    currentVersion: riskCase.version,
  });
}

/**
 * Vaka aksiyonları için ortak kapı: kimlik, ownership, state machine ve
 * concurrency kontrollerini tek yerde uygular (doküman §10).
 */
async function guardCaseAction(
  request: Request,
  caseId: string,
  targetStatus: CaseStatus,
): Promise<{ user: MockUser; riskCase: RiskCase } | Response> {
  const user = requireUser(request);
  if (isResponse(user)) return user;

  const riskCase = findCase(caseId);
  if (!riskCase) return notFound();

  if (user.role === 'ANALYST' && riskCase.assignedAnalystId !== user.id) return notFound();
  if (user.role === 'MUSTERI') {
    return fail(403, 'FORBIDDEN', 'Bu işlem için analist yetkisi gerekir.');
  }

  let version: number | undefined;
  try {
    const body = (await request.clone().json()) as { version?: number };
    version = body?.version;
  } catch {
    version = undefined;
  }

  if (version !== undefined && version !== riskCase.version) return versionConflict(riskCase);

  if (!canTransition(riskCase.status, targetStatus)) {
    return fail(
      422,
      'INVALID_CASE_TRANSITION',
      `${riskCase.status} durumundan ${targetStatus} durumuna geçilemez.`,
    );
  }

  return { user, riskCase };
}
