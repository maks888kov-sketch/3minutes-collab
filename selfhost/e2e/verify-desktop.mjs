// Verify the desktop fix: on a wide window the profile-setup "Далее" button
// must be visible (not clipped) and clickable.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, 'artifacts');
mkdirSync(ART, { recursive: true });

const BASE = 'http://localhost:5180';
const MAILPIT = 'http://localhost:8026';
const APP = '6a1356896fdf56fa48755d68';
const YANDEX = 'C:\\Program Files\\Yandex\\YandexBrowser\\Application\\browser.exe';
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5b0000000049454e44ae426082',
  'hex',
);

async function fetchOtp(email) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json();
    const msg = (list.messages || []).find((m) =>
      (m.To || []).some((t) => t.Address.toLowerCase() === email.toLowerCase()));
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const m = (full.Text || full.Snippet || '').match(/\b(\d{6})\b/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('no otp');
}

const browser = await chromium.launch({ executablePath: YANDEX, headless: false });
try {
  // Wide desktop window — exactly the situation the user hit.
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('3minutes_hide_add_to_home_hint', '1'); } catch {}
  });
  const page = await ctx.newPage();
  const email = `desk_${Date.now()}@example.com`;

  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  const pwds = page.locator('input[type="password"]');
  await pwds.nth(0).fill('secret123');
  await pwds.nth(1).fill('secret123');
  await page.getByRole('button', { name: /Создать аккаунт/ }).click();

  await page.waitForURL(/verify-email/, { timeout: 30000 });
  await page.getByPlaceholder('123456').fill(await fetchOtp(email));
  await page.getByRole('button', { name: /Подтвердить/ }).click();

  await page.waitForURL(/profile-setup/, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(ART, 'desktop-profile-setup.png') });

  const btn = page.getByRole('button', { name: /Далее/ });
  const visible = await btn.isVisible();
  const box = await btn.boundingBox();
  const vh = 900;
  const inViewport = box && box.y >= 0 && box.y + box.height <= vh;
  console.log('Далее visible:', visible, '| box:', box, '| within viewport:', inViewport);

  // Add a photo then actually click Далее to prove it's reachable.
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG });
  await page.getByText(/Загружено фото/).waitFor({ timeout: 20000 });
  await btn.click({ timeout: 5000 });
  await page.getByPlaceholder('Как тебя зовут?').waitFor({ timeout: 10000 });
  console.log('clicked Далее and advanced to step 2 ✅');

  if (!visible || !inViewport) {
    console.error('❌ button NOT fully in viewport');
    process.exit(1);
  }
  console.log('\n✅ DESKTOP FIX OK — "Далее" visible and clickable without clipping');
} finally {
  await browser.close();
}
