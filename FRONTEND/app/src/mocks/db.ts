import { assess, assignmentScore, DEFAULT_PROFILE } from './riskEngine';
import type {
  AiAssessment,
  AppNotification,
  AuditEntry,
  Badge,
  CaseNote,
  CaseStatus,
  CaseTransition,
  CurrentUser,
  FraudType,
  NotificationKind,
  PointEntry,
  PointRuleCode,
  RiskCase,
  Role,
  Transaction,
  TransactionType,
} from '@/domain/types';
import type { ServiceHealth } from '@/api/endpoints';

/* ============================================================== Yardımcı == */

let counter = 0;
/** ULID benzeri, sıralanabilir kimlik. */
function ulid(): string {
  counter += 1;
  return `01K${Date.now().toString(36).toUpperCase()}${counter.toString(36).toUpperCase().padStart(4, '0')}`;
}

let trxSequence = 120;
function nextTransactionNo(): string {
  trxSequence += 1;
  return `TRX-2026-${String(trxSequence).padStart(6, '0')}`;
}

let caseSequence = 40;
function nextCaseNo(): string {
  caseSequence += 1;
  return `CASE-2026-${String(caseSequence).padStart(5, '0')}`;
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/* ================================================================ Şemalar == */

export interface MockUser extends CurrentUser {
  /** Personel girişi için. Müşteri OTP kullanır. */
  password?: string;
  /** Ardışık başarısız giriş sayacı — 5'te kilitlenir (doküman §20). */
  failedAttempts: number;
  lockedUntil: number | null;
  activeCases: number;
  /** correct_decisions / total_decisions — atama skorunda kullanılır. */
  performance: number;
}

interface Db {
  users: MockUser[];
  transactions: Transaction[];
  assessments: Map<string, AiAssessment>;
  cases: RiskCase[];
  notifications: AppNotification[];
  points: PointEntry[];
  badges: Map<string, Badge[]>;
  audit: AuditEntry[];
  health: ServiceHealth[];
  /** OTP challenge'ları: id -> { msisdn, code, expiresAt } */
  otpChallenges: Map<string, { msisdn: string; code: string; expiresAt: number }>;
}

/* ============================================================ Seed: kullanıcılar == */

const CUSTOMER: MockUser = {
  id: 'usr-customer-ayse',
  fullName: 'Ayşe Yılmaz',
  role: 'MUSTERI',
  msisdn: '5551234567',
  specialties: [],
  regions: ['MARMARA'],
  failedAttempts: 0,
  lockedUntil: null,
  activeCases: 0,
  performance: 0,
};

function analyst(
  id: string,
  fullName: string,
  email: string,
  specialties: FraudType[],
  regions: CurrentUser['regions'],
  activeCases: number,
  performance: number,
  role: Role = 'ANALYST',
): MockUser {
  return {
    id,
    fullName,
    email,
    role,
    specialties,
    regions,
    password: 'Analist!2026',
    failedAttempts: 0,
    lockedUntil: null,
    activeCases,
    performance,
  };
}

const STAFF: MockUser[] = [
  analyst(
    'usr-analyst-deniz',
    'Deniz Aydın',
    'deniz.aydin@fraudcell.com',
    ['CALINTI_KART', 'HESAP_ELE_GECIRME'],
    ['MARMARA'],
    3,
    0.87,
  ),
  analyst(
    'usr-analyst-burak',
    'Burak Şen',
    'burak.sen@fraudcell.com',
    ['PARA_AKLAMA'],
    ['IC_ANADOLU'],
    6,
    0.79,
  ),
  analyst(
    'usr-analyst-selin',
    'Selin Koç',
    'selin.koc@fraudcell.com',
    ['CALINTI_KART', 'SUPHELI_DAVRANIS'],
    ['EGE'],
    1,
    0.92,
  ),
  analyst(
    'usr-analyst-emre',
    'Emre Doğan',
    'emre.dogan@fraudcell.com',
    ['HESAP_ELE_GECIRME', 'PARA_AKLAMA'],
    ['KARADENIZ'],
    8,
    0.71,
  ),
  analyst(
    'usr-supervisor-nil',
    'Nil Arslan',
    'nil.arslan@fraudcell.com',
    ['CALINTI_KART', 'HESAP_ELE_GECIRME', 'PARA_AKLAMA', 'SUPHELI_DAVRANIS'],
    ['MARMARA', 'EGE'],
    0,
    0.94,
    'SUPERVISOR',
  ),
  analyst('usr-admin-kaan', 'Kaan Öztürk', 'kaan.ozturk@fraudcell.com', [], ['MARMARA'], 0, 0, 'ADMIN'),
];

/* ================================================================== Db == */

export const db: Db = {
  users: [CUSTOMER, ...STAFF],
  transactions: [],
  assessments: new Map(),
  cases: [],
  notifications: [],
  points: [],
  badges: new Map(),
  audit: [],
  otpChallenges: new Map(),
  health: [
    { name: 'identity', displayName: 'Identity Service', status: 'UP', detail: 'Hazır' },
    { name: 'transaction', displayName: 'Transaction Service', status: 'UP', detail: 'Hazır' },
    { name: 'ai', displayName: 'AI Service', status: 'UP', detail: 'risk-1.0.0 yüklü' },
    { name: 'gamification', displayName: 'Gamification Service', status: 'UP', detail: 'Hazır' },
    { name: 'rabbitmq', displayName: 'RabbitMQ', status: 'UP', detail: '5 kuyruk aktif' },
  ],
};

export function serviceStatus(name: string): ServiceHealth['status'] {
  return db.health.find((service) => service.name === name)?.status ?? 'UP';
}

/** Demo panelinden servis kapatıp açmak için. */
export function setServiceStatus(name: string, status: ServiceHealth['status']): void {
  const service = db.health.find((s) => s.name === name);
  if (!service) return;
  service.status = status;
  service.detail = status === 'UP' ? 'Hazır' : 'Kapalı — kuyruk birikiyor';

  // AI geri geldiğinde bekleyen işlemler otomatik değerlendirilir (doküman §21).
  if (name === 'ai' && status === 'UP') drainPendingAssessments();
}

/* ========================================================= Olay yayını == */

type Listener = (event: { type: string; payload: unknown }) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(type: string, payload: unknown): void {
  for (const listener of listeners) listener({ type, payload });
}

function notify(
  userId: string,
  kind: NotificationKind,
  title: string,
  body: string,
  link: string | null,
): void {
  const notification: AppNotification = {
    id: ulid(),
    kind,
    title,
    body,
    link,
    createdAt: new Date().toISOString(),
    read: false,
  };
  db.notifications.unshift(notification);
  emit('notification', { userId, notification });
}

function audit(
  actor: MockUser,
  action: string,
  resourceType: string,
  resourceId: string,
  details: Record<string, unknown> = {},
): void {
  db.audit.unshift({
    id: ulid(),
    actorId: actor.id,
    actorName: actor.fullName,
    action,
    sourceService: 'transaction-service',
    resourceType,
    resourceId,
    ipAddress: '127.0.0.1',
    result: 'SUCCESS',
    occurredAt: new Date().toISOString(),
    correlationId: ulid(),
    details,
  });
}

/* ====================================================== Puan / rozetler == */

const POINT_RULES: Record<PointRuleCode, number> = {
  CASE_DECISION: 10,
  FAST_DECISION: 5,
  CONFIRMED_FRAUD: 15,
  CRITICAL_WITHIN_SLA: 15,
  SLA_BREACH: -10,
  CUSTOMER_FEEDBACK: 5,
};

function awardPoints(analystId: string, riskCase: RiskCase, ruleCodes: PointRuleCode[]): void {
  if (serviceStatus('gamification') === 'DOWN') {
    // Servis kapalıyken olay kuyrukta bekler; vaka kararı yine de başarılı olur.
    return;
  }

  for (const ruleCode of ruleCodes) {
    db.points.unshift({
      id: ulid(),
      caseId: riskCase.id,
      caseNo: riskCase.caseNo,
      ruleCode,
      points: POINT_RULES[ruleCode],
      occurredAt: new Date().toISOString(),
    });
  }

  const total = ruleCodes.reduce((sum, code) => sum + POINT_RULES[code], 0);
  notify(
    analystId,
    'POINTS_EARNED',
    `+${total} puan kazandın`,
    `${riskCase.caseNo} vakasındaki kararın için puan eklendi.`,
    '/konsol/puanlarim',
  );
}

const BADGE_CATALOG: Omit<Badge, 'earnedAt' | 'progress' | 'progressLabel'>[] = [
  { code: 'FIRST_CASE', name: 'İlk Adım', description: 'İlk vakanı sonuçlandır.' },
  { code: 'FRAUD_HUNTER', name: 'Fraud Avcısı', description: '10 dolandırıcılık vakası yakala.' },
  { code: 'SPEED_DEMON', name: 'Şimşek', description: '5 vakayı SLA süresinin yarısında kapat.' },
  { code: 'SHARPSHOOTER', name: 'Keskin Nişancı', description: '%90 üzeri karar doğruluğuna ulaş.' },
  { code: 'NIGHT_WATCH', name: 'Gece Nöbeti', description: 'Gece saatlerinde 5 kritik vaka çöz.' },
];

export function badgesFor(analystId: string): Badge[] {
  const existing = db.badges.get(analystId);
  if (existing) return existing;

  const resolved = db.points.filter((entry) => entry.ruleCode === 'CASE_DECISION').length;
  const frauds = db.points.filter((entry) => entry.ruleCode === 'CONFIRMED_FRAUD').length;

  const computed: Badge[] = BADGE_CATALOG.map((badge) => {
    const { progress, label } = badgeProgress(badge.code, resolved, frauds);
    return {
      ...badge,
      progress,
      progressLabel: label,
      earnedAt: progress >= 1 ? minutesAgo(600) : null,
    };
  });

  db.badges.set(analystId, computed);
  return computed;
}

function badgeProgress(
  code: string,
  resolved: number,
  frauds: number,
): { progress: number; label: string } {
  switch (code) {
    case 'FIRST_CASE':
      return { progress: Math.min(1, resolved), label: `${Math.min(resolved, 1)}/1 vaka` };
    case 'FRAUD_HUNTER':
      return { progress: Math.min(1, frauds / 10), label: `${frauds}/10 fraud` };
    case 'SPEED_DEMON':
      return { progress: Math.min(1, resolved / 5), label: `${Math.min(resolved, 5)}/5 hızlı karar` };
    case 'SHARPSHOOTER':
      return { progress: 0.87, label: '%87 / %90 doğruluk' };
    default:
      return { progress: 0.4, label: '2/5 gece vakası' };
  }
}

/* ================================================== İşlem ve değerlendirme == */

export interface CreateTransactionArgs {
  amount: number;
  transactionType: TransactionType;
  recipient: string;
  city: string;
  country: string;
  sourceDevice: string;
  /** Seed için geçmişe tarihli işlem üretmeye izin verir. */
  occurredAt?: string;
}

export function createTransaction(args: CreateTransactionArgs): Transaction {
  const transaction: Transaction = {
    id: ulid(),
    transactionNo: nextTransactionNo(),
    amount: args.amount,
    transactionType: args.transactionType,
    recipient: args.recipient,
    sourceDevice: args.sourceDevice,
    city: args.city,
    country: args.country,
    occurredAt: args.occurredAt ?? new Date().toISOString(),
    // İşlem her koşulda önce kaydedilir; AI kapalı olsa bile kaybolmaz.
    assessmentStatus: 'PENDING',
    riskScore: null,
    riskLevel: null,
    decision: null,
    fraudType: null,
    temporaryBlock: false,
    caseId: null,
  };

  db.transactions.unshift(transaction);
  emit('transaction.created', transaction);
  return transaction;
}

/** Gerçek sistemde RabbitMQ üzerinden dönen ai.assessment.completed olayı. */
const AI_LATENCY_MS = 3200;

export function scheduleAssessment(transactionId: string): void {
  window.setTimeout(() => applyAssessment(transactionId), AI_LATENCY_MS);
}

function applyAssessment(transactionId: string): void {
  const transaction = db.transactions.find((t) => t.id === transactionId);
  if (!transaction || transaction.assessmentStatus !== 'PENDING') return;

  // AI kapalıysa işlem PENDING kalır; servis dönünce drain edilir.
  if (serviceStatus('ai') === 'DOWN') return;

  const assessment = assess(transaction, DEFAULT_PROFILE);
  db.assessments.set(transaction.id, assessment);

  transaction.assessmentStatus = 'COMPLETED';
  transaction.riskScore = assessment.riskScore;
  transaction.riskLevel = assessment.riskLevel;
  transaction.decision = assessment.decision;
  transaction.fraudType = assessment.fraudType;

  if (assessment.decision === 'ONAY') {
    // ONAY: risk vakası oluşturulmaz (doküman §9).
    notify(
      CUSTOMER.id,
      'AI_ASSESSMENT_COMPLETED',
      'İşlemin onaylandı',
      `${transaction.transactionNo} numaralı işlemin güvenli bulundu.`,
      `/islem/${transaction.id}`,
    );
    emit('transaction.updated', transaction);
    return;
  }

  if (assessment.decision === 'BLOK') {
    transaction.temporaryBlock = true;
  }

  const riskCase = openCase(transaction, assessment);
  transaction.caseId = riskCase.id;

  notify(
    CUSTOMER.id,
    'AI_ASSESSMENT_COMPLETED',
    assessment.decision === 'BLOK' ? 'İşlemin güvenlik incelemesinde' : 'İşlemin inceleniyor',
    `${transaction.transactionNo} için risk değerlendirmesi tamamlandı.`,
    `/islem/${transaction.id}`,
  );

  emit('transaction.updated', transaction);
  emit('case.created', riskCase);
}

/** AI servisi geri geldiğinde bekleyen tüm işlemleri değerlendirir. */
export function drainPendingAssessments(): void {
  const pending = db.transactions.filter((t) => t.assessmentStatus === 'PENDING');
  pending.forEach((transaction, index) => {
    // Sırayla işlensin ki arayüzde birer birer düşsün.
    window.setTimeout(() => applyAssessment(transaction.id), 400 * (index + 1));
  });
}

/* ========================================================== Vaka yaşam döngüsü == */

function openCase(transaction: Transaction, assessment: AiAssessment): RiskCase {
  const critical = assessment.decision === 'BLOK';
  const now = new Date();

  const riskCase: RiskCase = {
    id: ulid(),
    caseNo: nextCaseNo(),
    transactionId: transaction.id,
    transaction,
    status: 'YENI',
    assignmentStatus: 'QUEUED',
    assignedAnalystId: null,
    assignedAnalystName: null,
    riskScore: assessment.riskScore,
    riskLevel: assessment.riskLevel,
    fraudType: assessment.fraudType,
    fraudTypeOverriddenFrom: null,
    // KRITIK vakada 15 dakikalık SLA başlar (doküman §9).
    slaDueAt: critical ? new Date(now.getTime() + 15 * 60_000).toISOString() : null,
    slaBreached: false,
    createdAt: now.toISOString(),
    closedAt: null,
    notes: [],
    transitions: [
      {
        id: ulid(),
        fromStatus: null,
        toStatus: 'YENI',
        actorId: 'system',
        actorName: 'Sistem',
        occurredAt: now.toISOString(),
        reason: `AI değerlendirmesi: ${assessment.decision}`,
      },
    ],
    verificationRequests: [],
    version: 1,
  };

  db.cases.unshift(riskCase);
  tryAssign(riskCase);
  return riskCase;
}

/**
 * AI adayları sıralar; atamayı Transaction Service kesinleştirir (doküman §13).
 * Kapasitesi dolu analist atanmaz — vaka YENI + QUEUED kalır.
 */
export function rankCandidates(riskCase: RiskCase) {
  return db.users
    .filter((user) => user.role === 'ANALYST')
    .map((user) => {
      const expertiseMatch: 0 | 1 =
        riskCase.fraudType && user.specialties.includes(riskCase.fraudType) ? 1 : 0;
      return {
        analystId: user.id,
        analystName: user.fullName,
        expertiseMatch,
        capacityRatio: Math.max(0, 1 - user.activeCases / 10),
        performance: user.performance,
        activeCases: user.activeCases,
        assignmentScore: assignmentScore({
          expertiseMatch,
          activeCases: user.activeCases,
          performance: user.performance,
        }),
      };
    })
    .sort((a, b) => {
      if (b.assignmentScore !== a.assignmentScore) return b.assignmentScore - a.assignmentScore;
      // Beraberlik bozma sırası: az aktif vaka -> yüksek başarı -> ID sırası.
      if (a.activeCases !== b.activeCases) return a.activeCases - b.activeCases;
      if (b.performance !== a.performance) return b.performance - a.performance;
      return a.analystId.localeCompare(b.analystId);
    });
}

function tryAssign(riskCase: RiskCase): void {
  const candidate = rankCandidates(riskCase).find((c) => c.activeCases < 10);
  if (!candidate) return;

  const analystUser = db.users.find((u) => u.id === candidate.analystId);
  if (!analystUser) return;

  analystUser.activeCases += 1;
  riskCase.assignedAnalystId = analystUser.id;
  riskCase.assignedAnalystName = analystUser.fullName;
  riskCase.assignmentStatus = 'ASSIGNED';
  transition(riskCase, 'ATANDI', 'system', 'Sistem', 'Otomatik atama');

  notify(
    analystUser.id,
    'CASE_ASSIGNED',
    'Yeni vaka atandı',
    `${riskCase.caseNo} — ${riskCase.transaction.transactionNo}`,
    `/konsol/vaka/${riskCase.id}`,
  );
}

export function transition(
  riskCase: RiskCase,
  to: CaseStatus,
  actorId: string,
  actorName: string,
  reason?: string,
): void {
  const entry: CaseTransition = {
    id: ulid(),
    fromStatus: riskCase.status,
    toStatus: to,
    actorId,
    actorName,
    occurredAt: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  };
  riskCase.transitions.push(entry);
  riskCase.status = to;
  riskCase.version += 1;
  emit('case.updated', riskCase);
}

export function addNote(riskCase: RiskCase, author: MockUser, body: string): CaseNote {
  const note: CaseNote = {
    id: ulid(),
    authorId: author.id,
    authorName: author.fullName,
    body,
    createdAt: new Date().toISOString(),
  };
  riskCase.notes.push(note);
  return note;
}

/** Karar verildiğinde puan kurallarını uygular ve vakayı kapatır. */
export function decideCase(
  riskCase: RiskCase,
  decision: 'ONAYLANDI' | 'BLOKLANDI',
  note: string,
  actor: MockUser,
): void {
  if (note.trim()) addNote(riskCase, actor, note.trim());

  transition(riskCase, decision, actor.id, actor.fullName, `Analist kararı: ${decision}`);
  riskCase.closedAt = new Date().toISOString();

  const rules: PointRuleCode[] = ['CASE_DECISION'];

  const ageMs = Date.now() - new Date(riskCase.createdAt).getTime();
  if (ageMs < 5 * 60_000) rules.push('FAST_DECISION');
  if (decision === 'BLOKLANDI') rules.push('CONFIRMED_FRAUD');
  if (riskCase.slaDueAt && !riskCase.slaBreached && Date.now() < new Date(riskCase.slaDueAt).getTime()) {
    rules.push('CRITICAL_WITHIN_SLA');
  }

  awardPoints(actor.id, riskCase, rules);

  const analystUser = db.users.find((u) => u.id === riskCase.assignedAnalystId);
  if (analystUser) analystUser.activeCases = Math.max(0, analystUser.activeCases - 1);

  // BLOKLANDI -> KAPANDI 48 saat sonra sistem tarafından yapılır (ADR-012).
  // Demo için ONAYLANDI hemen kapanır.
  if (decision === 'ONAYLANDI') {
    transition(riskCase, 'KAPANDI', 'system', 'Sistem', 'Onay sonrası kapanış');
  }

  riskCase.transaction.temporaryBlock = decision === 'BLOKLANDI';

  audit(actor, decision === 'BLOKLANDI' ? 'CASE_BLOCKED' : 'CASE_APPROVED', 'risk-case', riskCase.id, {
    previousStatus: 'INCELENIYOR',
    newStatus: decision,
  });

  notify(
    'usr-customer-ayse',
    'CASE_CLOSED',
    decision === 'BLOKLANDI' ? 'İşlemin bloklandı' : 'İşlemin onaylandı',
    `${riskCase.transaction.transactionNo} için inceleme tamamlandı.`,
    `/islem/${riskCase.transactionId}`,
  );
}

/**
 * Müşteri "ben yapmadım" dediğinde: risk skoru en az 0.91'e çekilir ve işlem
 * geçici bloklanır. Nihai BLOKLANDI kararını yine analist verir (doküman §11).
 */
export function applyCustomerResponse(riskCase: RiskCase, response: 'MINE' | 'NOT_MINE'): void {
  const pending = riskCase.verificationRequests.find((request) => !request.respondedAt);
  if (pending) {
    pending.respondedAt = new Date().toISOString();
    pending.response = response;
  }

  if (response === 'NOT_MINE') {
    riskCase.riskScore = Math.max(riskCase.riskScore ?? 0, 0.91);
    riskCase.riskLevel = 'KRITIK';
    riskCase.transaction.riskScore = riskCase.riskScore;
    riskCase.transaction.riskLevel = 'KRITIK';
    riskCase.transaction.temporaryBlock = true;
  }

  transition(
    riskCase,
    'INCELENIYOR',
    'usr-customer-ayse',
    'Ayşe Yılmaz',
    response === 'NOT_MINE' ? 'Müşteri işlemi reddetti' : 'Müşteri işlemi doğruladı',
  );

  if (riskCase.assignedAnalystId) {
    notify(
      riskCase.assignedAnalystId,
      'VERIFICATION_REQUESTED',
      response === 'NOT_MINE' ? 'Müşteri: "Ben yapmadım"' : 'Müşteri işlemi doğruladı',
      `${riskCase.caseNo} için müşteri yanıtı geldi.`,
      `/konsol/vaka/${riskCase.id}`,
    );
  }
}

/* ================================================================ Seed == */

const SEED_DEVICE = 'Xiaomi Redmi Note 12';

/** Demoya hazır başlangıç verisi: geçmiş işlemler, açık vakalar, puanlar. */
export function seed(): void {
  if (db.transactions.length > 0) return;

  const history: (CreateTransactionArgs & { minutesAgo: number })[] = [
    {
      amount: 240,
      transactionType: 'FATURA_ODEME',
      recipient: 'Turkcell Fatura',
      city: 'İstanbul',
      country: 'TR',
      sourceDevice: SEED_DEVICE,
      minutesAgo: 60 * 26,
    },
    {
      amount: 750,
      transactionType: 'PARA_GONDERME',
      recipient: 'Mehmet Kaya',
      city: 'İstanbul',
      country: 'TR',
      sourceDevice: SEED_DEVICE,
      minutesAgo: 60 * 18,
    },
    {
      amount: 6800,
      transactionType: 'PARA_GONDERME',
      recipient: 'Volkan Tez',
      city: 'Antalya',
      country: 'TR',
      sourceDevice: 'iPhone 15 Pro',
      minutesAgo: 95,
    },
    {
      amount: 18_000,
      transactionType: 'YURT_DISI_TRANSFER',
      recipient: 'Global Trade Ltd',
      city: 'Berlin',
      country: 'DE',
      sourceDevice: 'Chrome / macOS',
      minutesAgo: 42,
    },
  ];

  for (const item of history) {
    const { minutesAgo: ago, ...args } = item;
    const transaction = createTransaction({ ...args, occurredAt: minutesAgo(ago) });
    // Seed işlemleri anında değerlendirilir — demo açılışında ekran dolu gelir.
    applySeedAssessment(transaction);
  }

  // Analistin geçmiş puanları — liderlik tablosu boş görünmesin.
  const seedPoints: [PointRuleCode, number][] = [
    ['CASE_DECISION', 180],
    ['CONFIRMED_FRAUD', 320],
    ['FAST_DECISION', 95],
    ['CRITICAL_WITHIN_SLA', 240],
  ];
  for (const [ruleCode, minutes] of seedPoints) {
    db.points.push({
      id: ulid(),
      caseId: null,
      caseNo: null,
      ruleCode,
      points: POINT_RULES[ruleCode],
      occurredAt: minutesAgo(minutes),
    });
  }
}

function applySeedAssessment(transaction: Transaction): void {
  const assessment = assess(transaction, DEFAULT_PROFILE);
  db.assessments.set(transaction.id, assessment);

  transaction.assessmentStatus = 'COMPLETED';
  transaction.riskScore = assessment.riskScore;
  transaction.riskLevel = assessment.riskLevel;
  transaction.decision = assessment.decision;
  transaction.fraudType = assessment.fraudType;

  if (assessment.decision === 'ONAY') return;

  if (assessment.decision === 'BLOK') transaction.temporaryBlock = true;
  const riskCase = openCase(transaction, assessment);
  transaction.caseId = riskCase.id;
}

/* ===================================================== Kimlik yardımcıları == */

export function findUserByMsisdn(msisdn: string): MockUser | undefined {
  return db.users.find((user) => user.msisdn === msisdn.replace(/\D/g, ''));
}

export function findUserByEmail(email: string): MockUser | undefined {
  return db.users.find((user) => user.email?.toLowerCase() === email.toLowerCase().trim());
}

export function findUserById(id: string): MockUser | undefined {
  return db.users.find((user) => user.id === id);
}

export function createOtpChallenge(msisdn: string): { challengeId: string; code: string } {
  const challengeId = ulid();
  // Demo kolaylığı: kod sabit. Gerçek sistemde SMS ile gider.
  const code = '142536';
  db.otpChallenges.set(challengeId, {
    msisdn: msisdn.replace(/\D/g, ''),
    code,
    expiresAt: Date.now() + 180_000,
  });
  return { challengeId, code };
}

export { ulid, POINT_RULES };
