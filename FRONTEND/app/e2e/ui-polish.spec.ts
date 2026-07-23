import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const outputDir = path.resolve(process.cwd(), '../../BEGEN/POLISHED');
const now = new Date('2026-07-23T02:00:00Z').toISOString();

function envelope(data: unknown) {
  return {
    success: true,
    data,
    error: null,
    meta: { traceId: 'ui-polish', pagination: null, generatedAt: now },
  };
}

function pageData(items: unknown[]) {
  return { items, page: { nextCursor: null, hasMore: false, limit: 100 } };
}

const transactions = [
  { transactionId: 'trx-1', transactionNo: 'TRX-2026-004281', amount: 24_750, currency: 'TRY', transactionType: 'TRANSFER', assessmentStatus: 'COMPLETED', displayRiskLevel: 'DUSUK', screeningDecision: 'ONAY', controlStatus: 'ONAYLANDI', createdAt: now },
  { transactionId: 'trx-2', transactionNo: 'TRX-2026-004173', amount: 8_490, currency: 'TRY', transactionType: 'ODEME', assessmentStatus: 'COMPLETED', displayRiskLevel: 'ORTA', screeningDecision: 'INCELEME', controlStatus: 'KONTROL_BEKLIYOR', createdAt: '2026-07-22T18:30:00Z' },
  { transactionId: 'trx-3', transactionNo: 'TRX-2026-003992', amount: 1_285, currency: 'TRY', transactionType: 'FATURA', assessmentStatus: 'COMPLETED', displayRiskLevel: 'DUSUK', screeningDecision: 'ONAY', controlStatus: 'ONAYLANDI', createdAt: '2026-07-21T11:15:00Z' },
];

const cases = [
  ['case-1', 'TRX-2026-004281', 64_500, 'KRITIK', 'URGENT', 'HESAP_ELE_GECIRME', 'INCELENIYOR'],
  ['case-2', 'TRX-2026-004173', 28_900, 'YUKSEK', 'WARNING', 'CALINTI_KART', 'ATANDI'],
  ['case-3', 'TRX-2026-004051', 12_250, 'ORTA', 'NORMAL', 'SUPHELI_DAVRANIS', 'ATANDI'],
  ['case-4', 'TRX-2026-003987', 91_000, 'KRITIK', 'BREACHED', 'PARA_AKLAMA', 'INCELENIYOR'],
].map(([caseId, transactionNo, amount, riskLevel, slaStatus, fraudType, status], index) => ({
  caseId,
  transaction: { transactionId: `trx-case-${index}`, transactionNo, amount, currency: 'TRY', transactionType: 'TRANSFER', recipientReference: `TR${index + 1}000`, city: 'İstanbul', countryCode: 'TR', occurredAt: now },
  status,
  assignmentStatus: status === 'INCELENIYOR' ? 'IN_PROGRESS' : 'ASSIGNED',
  assignedAnalystId: 'usr_analyst_1',
  effectiveRisk: { riskScore: riskLevel === 'KRITIK' ? 0.94 : 0.72, riskLevel, fraudType, overridden: false },
  finalDecision: null,
  decisionNote: null,
  sla: { priority: riskLevel, startedAt: now, deadlineAt: '2026-07-23T03:00:00Z', breachedAt: slaStatus === 'BREACHED' ? now : null, stoppedAt: null, status: slaStatus, remainingSeconds: slaStatus === 'BREACHED' ? -600 : 2400 + index * 900 },
  version: 1,
  createdAt: now,
  updatedAt: now,
}));

async function stubCustomerData(page: Page): Promise<void> {
  await page.route('**/api/v1/transactions**', (route) => route.fulfill({ json: envelope(pageData(transactions)) }));
  await page.route('**/api/v1/customer/verifications/pending**', (route) => route.fulfill({ json: envelope([]) }));
}

async function stubCaseData(page: Page): Promise<void> {
  await page.route('**/api/v1/cases/assigned**', (route) => route.fulfill({ json: envelope(pageData(cases)) }));
  await page.route(/\/api\/v1\/cases(?:\?.*)?$/, (route) => route.fulfill({ json: envelope(pageData(cases)) }));
}

async function stubSupervisorData(page: Page): Promise<void> {
  await stubCaseData(page);
  await page.route('**/api/v1/ai/metrics/overview**', (route) => route.fulfill({ json: envelope({ sampleCount: 1248, fraudTypeAccuracy: 0.93, decisionAgreementRate: 0.89, falsePositiveRate: 0.04, totalPredictions: 4820, modelBundleVersion: 'fraudcell-2026.07', calculatedAt: now }) }));
  await page.route('**/api/v1/ai/metrics/categories**', (route) => route.fulfill({ json: envelope({ items: [
    { fraudType: 'CALINTI_KART', sampleCount: 420, accuracy: 0.95 },
    { fraudType: 'HESAP_ELE_GECIRME', sampleCount: 318, accuracy: 0.91 },
    { fraudType: 'PARA_AKLAMA', sampleCount: 275, accuracy: 0.88 },
  ] }) }));
  await page.route('**/api/v1/ai/metrics/decision-agreement**', (route) => route.fulfill({ json: envelope({ sampleCount: 1150, decisionAgreementRate: 0.89 }) }));
}

async function stubAdminData(page: Page): Promise<void> {
  const staff = [
    ['staff-1', 'Deniz', 'Kaya', 'deniz@fraudcell.com', 'ANALYST', true, true],
    ['staff-2', 'Emre', 'Yıldız', 'emre@fraudcell.com', 'ANALYST', true, true],
    ['staff-3', 'Selin', 'Arslan', 'selin@fraudcell.com', 'SUPERVISOR', true, false],
    ['staff-4', 'Mert', 'Doğan', 'mert@fraudcell.com', 'ADMIN', true, false],
  ].map(([id, firstName, lastName, email, role, isActive, assignmentEnabled]) => ({ id, firstName, lastName, email, role, specialties: role === 'ANALYST' ? ['CALINTI_KART'] : [], regions: role === 'ANALYST' ? ['MARMARA'] : [], assignmentEnabled, isActive, version: 1, createdAt: now }));
  await page.route('**/api/v1/staff**', (route) => route.fulfill({ json: envelope(pageData(staff)) }));
  await page.route('**/api/v1/reference/**', (route) => route.fulfill({ json: envelope([]) }));
}

async function loginStaff(page: Page, email: string): Promise<void> {
  await page.goto('/auth/staff');
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[name="password"]').fill('Fraud.2026');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForLoadState('networkidle');
}

async function loginCustomer(page: Page): Promise<void> {
  await page.goto('/auth/otp?mode=login');
  await page.getByLabel('Cep telefonu').fill('5551234512');
  await page.getByRole('button', { name: 'Kod gönder' }).click();
  await page.getByLabel('1. hane').fill('1234');
  await page.getByRole('button', { name: 'Doğrula' }).click();
  await page.waitForLoadState('networkidle');
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.beforeAll(async () => {
  await mkdir(outputDir, { recursive: true });
});

test('customer dashboard — desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubCustomerData(page);
  await loginCustomer(page);
  await expect(page.getByRole('heading', { name: /Merhaba/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(outputDir, 'customer-dashboard-desktop.png'), fullPage: true });
});

test('customer dashboard — mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await stubCustomerData(page);
  await loginCustomer(page);
  await expect(page.getByRole('heading', { name: /Merhaba/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(outputDir, 'customer-dashboard-mobile.png'), fullPage: true });
});

test('analyst dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubCaseData(page);
  await loginStaff(page, 'analist@fraudcell.com');
  await expect(page.getByRole('heading', { name: 'Analist çalışma alanı' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(outputDir, 'analyst-dashboard.png'), fullPage: true });
});

test('supervisor dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubSupervisorData(page);
  await loginStaff(page, 'supervizor@fraudcell.com');
  await expect(page.getByRole('heading', { name: 'Operasyon kontrol merkezi' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(outputDir, 'supervisor-dashboard.png'), fullPage: true });
});

test('admin dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubAdminData(page);
  await loginStaff(page, 'admin@fraudcell.com');
  await expect(page.getByRole('heading', { name: 'Ekip ve yetki merkezi' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: path.join(outputDir, 'admin-dashboard.png'), fullPage: true });
});
