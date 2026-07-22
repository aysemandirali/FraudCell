import { expect, test, type Page } from '@playwright/test';

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404 || response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function clickConsoleLink(page: Page, name: string): Promise<void> {
  const menuButton = page.getByRole('button', { name: 'Menüyü aç' });
  if (await menuButton.isVisible()) await menuButton.click();
  await page.getByRole('link', { name, exact: true }).click();
}

async function signOut(page: Page): Promise<void> {
  const sidebarButton = page.getByRole('button', { name: 'Çıkış yap' });
  if (await sidebarButton.isVisible()) {
    await sidebarButton.click();
    return;
  }
  await page.getByRole('button', { name: 'Kullanıcı menüsü' }).click();
  await page.getByRole('menuitem', { name: 'Çıkış yap' }).click();
}

test('staff can sign in through the live gateway and sign out', async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/auth');

  await expect(page.getByRole('heading', { name: 'Hoş geldin' })).toBeVisible();
  await page.getByRole('link', { name: /Personel girişi/ }).click();
  await page.screenshot({ path: testInfo.outputPath('staff-login.png'), fullPage: true });

  await page.getByLabel('E-posta').fill('admin@fraudcell.local');
  await page.getByLabel('Şifre', { exact: true }).fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Giriş yap' }).click();

  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByText('Personel yönetimi', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-authenticated.png'), fullPage: true });

  await clickConsoleLink(page, 'Denetim');
  await expect(page.getByRole('heading', { name: 'Denetim kayıtları' })).toBeVisible();
  await expect(page.getByText('LOGIN_SUCCEEDED', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-audit.png'), fullPage: true });

  await signOut(page);
  await expect(page).toHaveURL(/\/auth\/?$/);
  await expect(page.getByRole('heading', { name: 'Hoş geldin' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test('new customer can register and complete the live AI transaction flow', async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  const gsmNumber = `5${String(Date.now()).slice(-9)}`;
  await page.goto('/auth');

  await page.getByRole('link', { name: /Yeni müşteri/ }).click();
  await page.screenshot({ path: testInfo.outputPath('customer-register.png'), fullPage: true });
  await page.getByLabel('Cep telefonu').fill(gsmNumber);
  await page.getByLabel('Ad', { exact: true }).fill('E2E');
  await page.getByLabel('Soyad').fill('Müşteri');
  await page.getByRole('button', { name: 'Kod gönder' }).click();

  await expect(page.getByText(/OTP: 1234/)).toBeVisible();
  await page.getByLabel('1. hane').fill('1');
  await page.getByLabel('2. hane').fill('2');
  await page.getByLabel('3. hane').fill('3');
  await page.getByLabel('4. hane').fill('4');
  const realtimeConnected = page.waitForResponse(
    (response) => response.url().includes('/api/v1/events?ticket=') && response.status() === 200,
  );
  await page.getByRole('button', { name: 'Doğrula' }).click();

  await expect(page).toHaveURL(/\/customer\/?$/);
  await realtimeConnected;
  await expect(page.getByRole('heading', { name: 'FraudCell müşterisi' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('customer-authenticated.png'), fullPage: true });

  await page.getByRole('main').getByRole('link', { name: 'Yeni işlem', exact: true }).click();
  await page.getByLabel('Tutar (TRY)').fill('50000');
  await page.getByLabel('Alıcı referansı').fill(`E2E-${Date.now()}`);
  await page.getByLabel('Şehir').fill('New York');
  await page.getByLabel('Ülke').fill('US');
  await page.getByRole('button', { name: 'İşlemi gönder' }).click();

  await expect(page).toHaveURL(/\/customer\/transactions\/[0-9A-Z]+$/);
  await expect(page.getByRole('heading', { name: 'AI değerlendirmesi' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText('Islem degerlendirmesi tamamlandi', { exact: true })).toBeVisible();
  await expect(page.getByText('Geçici blokta')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('customer-ai-assessment.png'), fullPage: true });

  await page.getByRole('link', { name: 'Ana Sayfa', exact: true }).click();
  await page.getByRole('link', { name: 'Bildirimler', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bildirimler' })).toBeVisible();
  await expect(page.getByText('Islem degerlendirmesi tamamlandi', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('customer-notifications.png'), fullPage: true });
  await page.getByRole('link', { name: 'Profil' }).click();
  await expect(page.getByRole('heading', { name: 'Profil ve güvenlik' })).toBeVisible();
  await expect(page.getByText('Bu cihaz', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('customer-profile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Doğrulama' }).click();
  await expect(page.getByText('Bekleyen doğrulama yok', { exact: true })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
