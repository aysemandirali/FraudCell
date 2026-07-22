import type { CaseStatus, Role } from './types';

/**
 * Vaka state machine — doküman §10.
 * Generic "status update" endpoint'i yoktur; her geçiş niyet belirten bir
 * operasyonla tetiklenir. Arayüz de yalnızca izin verilen aksiyonları gösterir.
 */
export const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  YENI: ['ATANDI'],
  ATANDI: ['INCELENIYOR'],
  INCELENIYOR: ['MUSTERI_DOGRULAMA', 'ONAYLANDI', 'BLOKLANDI'],
  MUSTERI_DOGRULAMA: ['INCELENIYOR'],
  ONAYLANDI: ['KAPANDI'],
  /** BLOKLANDI -> KAPANDI 48 saat sonra sistem tarafından yapılır (ADR-012). */
  BLOKLANDI: ['KAPANDI'],
  KAPANDI: [],
};

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Vakanın yaşam döngüsündeki sıralı adımlar — zaman çizelgesi göstergesi için. */
export const CASE_TIMELINE: CaseStatus[] = [
  'YENI',
  'ATANDI',
  'INCELENIYOR',
  'ONAYLANDI',
  'KAPANDI',
];

/* ------------------------------------------------------------- Aksiyonlar -- */

export type CaseActionKind =
  | 'START_REVIEW'
  | 'REQUEST_VERIFICATION'
  | 'DECIDE_APPROVE'
  | 'DECIDE_BLOCK'
  | 'REASSIGN'
  | 'OVERRIDE_FRAUD_TYPE';

export interface CaseActionSpec {
  kind: CaseActionKind;
  label: string;
  /** Bu aksiyonun görünür olduğu vaka durumları. */
  visibleIn: CaseStatus[];
  /** Aksiyonu çalıştırabilen roller. */
  roles: Role[];
  /** Yıkıcı/karar niteliğinde mi — arayüzde onay ister. */
  confirm: boolean;
}

export const CASE_ACTIONS: CaseActionSpec[] = [
  {
    kind: 'START_REVIEW',
    label: 'İncelemeye Başla',
    visibleIn: ['ATANDI'],
    roles: ['ANALYST', 'SUPERVISOR'],
    confirm: false,
  },
  {
    kind: 'REQUEST_VERIFICATION',
    label: 'Müşteri Doğrulaması İste',
    visibleIn: ['INCELENIYOR'],
    roles: ['ANALYST', 'SUPERVISOR'],
    confirm: false,
  },
  {
    kind: 'DECIDE_APPROVE',
    label: 'İşlemi Onayla',
    visibleIn: ['INCELENIYOR'],
    roles: ['ANALYST', 'SUPERVISOR'],
    confirm: true,
  },
  {
    kind: 'DECIDE_BLOCK',
    label: 'İşlemi Blokla',
    visibleIn: ['INCELENIYOR'],
    roles: ['ANALYST', 'SUPERVISOR'],
    confirm: true,
  },
  {
    kind: 'REASSIGN',
    label: 'Manuel Ata',
    visibleIn: ['YENI', 'ATANDI', 'INCELENIYOR'],
    roles: ['SUPERVISOR'],
    confirm: false,
  },
  {
    kind: 'OVERRIDE_FRAUD_TYPE',
    label: 'Fraud Tipini Değiştir',
    visibleIn: ['ATANDI', 'INCELENIYOR', 'MUSTERI_DOGRULAMA'],
    roles: ['SUPERVISOR'],
    confirm: false,
  },
];

/**
 * Verili vaka durumu ve kullanıcı için görünmesi gereken aksiyonlar.
 * Bu yalnızca arayüz filtresidir — yetki kontrolünün otoritesi servistir
 * (doküman §7); backend aynı kuralı ownership ile birlikte tekrar uygular.
 */
export function availableActions(
  status: CaseStatus,
  role: Role,
  opts: { isAssignedToMe: boolean },
): CaseActionSpec[] {
  return CASE_ACTIONS.filter((action) => {
    if (!action.visibleIn.includes(status)) return false;
    if (!action.roles.includes(role)) return false;
    // Analist yalnızca kendine atanmış vakada işlem yapabilir; süpervizör her vakada.
    if (role === 'ANALYST' && !opts.isAssignedToMe) return false;
    return true;
  });
}
