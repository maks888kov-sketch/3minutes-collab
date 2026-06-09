// End-to-end test driven through Yandex Browser (Chromium-based) via playwright-core.
// Verifies, against the fully self-hosted stack: AUTH (register + email OTP +
// verify + profile setup with photo upload), CHAT (two real users exchanging
// messages), and VIDEO CALL (the 3-minute call flow + mutual "continue" unlock).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, 'artifacts');
mkdirSync(ART, { recursive: true });

const BASE = process.env.BASE || 'http://localhost:5180';
const MAILPIT = process.env.MAILPIT || 'http://localhost:8026';
const APP = process.env.APP_ID || '6a1356896fdf56fa48755d68';
const YANDEX =
  process.env.YANDEX || 'C:\\Program Files\\Yandex\\YandexBrowser\\Application\\browser.exe';

const apiUrl = (p) => `${BASE}/api/apps/${APP}${p}`;
const log = (...a) => console.log(...a);
const pass = (m) => log('  ✅', m);
function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  pass(msg);
}

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5b0000000049454e44ae426082',
  'hex',
);

async function apiCall(path, { method = 'GET', body, token } = {}) {
  const headers = { 'X-App-Id': APP };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(apiUrl(path), { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return data;
}

async function fetchOtp(email) {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages?limit=50`)).json();
    const msg = (list.messages || []).find((m) =>
      (m.To || []).some((t) => t.Address.toLowerCase() === email.toLowerCase()),
    );
    if (msg) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json();
      const match = (full.Text || full.Snippet || '').match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No OTP email arrived for ${email}`);
}

async function registerAndSetup(context, label, email, city) {
  const password = 'secret123';
  const page = await context.newPage();
  page.on('pageerror', (e) => log(`   [${label} pageerror]`, e.message));

  log(`[${label}] open /register`);
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', email);
  const pwds = page.locator('input[type="password"]');
  await pwds.nth(0).fill(password);
  await pwds.nth(1).fill(password);
  await page.getByRole('button', { name: /Создать аккаунт/ }).click();

  log(`[${label}] verify email`);
  await page.waitForURL(/verify-email/, { timeout: 30000 });
  const code = await fetchOtp(email);
  log(`[${label}] OTP = ${code}`);
  await page.getByPlaceholder('123456').fill(code);
  await page.getByRole('button', { name: /Подтвердить/ }).click();

  log(`[${label}] profile setup`);
  await page.waitForURL(/profile-setup/, { timeout: 30000 });
  // Step 0 — upload a photo
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'me.png', mimeType: 'image/png', buffer: PNG,
  });
  await page.getByText(/Загружено фото/, { timeout: 20000 }).waitFor();
  await page.getByRole('button', { name: /Далее/ }).click();
  // Step 1 — basics
  await page.getByPlaceholder('Как тебя зовут?').fill(label);
  await page.getByPlaceholder('Ваш возраст').fill('25');
  await page.locator('select').selectOption(city);
  await page.getByRole('button', { name: /Далее/ }).click();
  // Step 2 — bio
  await page.getByRole('button', { name: /Далее/ }).click();
  // Step 3 — interests
  await page.getByRole('button', { name: /Далее/ }).click();
  // Step 4 — goal -> finish
  await page.getByRole('button', { name: /Готово/ }).click();

  await page.waitForURL(/discover/, { timeout: 30000 });
  await page.getByText('Фильтры').first().waitFor({ timeout: 30000 });
  pass(`[${label}] AUTH complete -> on /discover`);

  const token = await page.evaluate(() =>
    window.localStorage.getItem('base44_access_token'),
  );
  const profiles = await apiCall(
    `/entities/Profile?q=${encodeURIComponent(JSON.stringify({ created_by: email }))}`,
    { token },
  );
  return { page, token, email, profileId: profiles[0].id };
}

async function doVideoCall(page, label, matchId) {
  log(`[${label}] video call`);
  await page.goto(`${BASE}/video-call/${matchId}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Начать (встречу|звонок)/ }).click({ timeout: 30000 });
  // active phase -> end the call early (red phone button)
  const endBtn = page.locator('button:has(svg.lucide-phone-off)');
  await endBtn.waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(ART, `${label}-video-active.png`) });
  await endBtn.click();
  // rating -> pick reaction -> continue
  await page.getByText('Как прошло ваше знакомство?').waitFor({ timeout: 10000 });
  await page.getByText('Отлично').click();
  await page.getByRole('button', { name: /Продолжить общение/ }).click();
  pass(`[${label}] video call -> "continue"`);
  await page.waitForTimeout(2500);
}

function resetDb() {
  // Deterministic swipe test: start from a clean DB so the discover top card
  // is guaranteed to be the other test user (not leftover profiles).
  try {
    execSync(
      'docker exec 3min-postgres psql -U threemin -d threemin -c ' +
        '"TRUNCATE profiles, matches, messages, likes, users, otp_codes, feedback CASCADE;"',
      { stdio: 'ignore' },
    );
    log('DB reset (clean slate for the swipe test)');
  } catch (e) {
    log('warn: DB reset skipped:', e.message);
  }
}

async function main() {
  resetDb();
  const browser = await chromium.launch({
    executablePath: YANDEX,
    headless: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  try {
    // Mobile-first layout: use a phone viewport so the swipe action buttons
    // sit above the fixed bottom navigation bar.
    const viewport = { width: 412, height: 915 };
    const ctxA = await browser.newContext({ viewport });
    const ctxB = await browser.newContext({ viewport });
    await ctxA.grantPermissions(['camera', 'microphone'], { origin: BASE });
    await ctxB.grantPermissions(['camera', 'microphone'], { origin: BASE });
    // Suppress the "add to home screen" PWA hint so it doesn't overlay controls.
    const hideHint = () => {
      try { localStorage.setItem('3minutes_hide_add_to_home_hint', '1'); } catch {}
    };
    await ctxA.addInitScript(hideHint);
    await ctxB.addInitScript(hideHint);

    const ts = Date.now();
    log('\n=== PART 1: AUTH (two real users via UI) ===');
    const A = await registerAndSetup(ctxA, 'Alice', `alice_${ts}@example.com`, 'Москва');
    const B = await registerAndSetup(ctxB, 'Bob', `bob_${ts}@example.com`, 'Москва');
    log('\n=== PART 2: MATCH via swipe (in the browser) ===');
    const likeBtn = (page) => page.locator('button:has(svg.lucide-heart)').first();
    // Refresh both feeds so each sees the other real profile (sorted before bots).
    await A.page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded' });
    await likeBtn(A.page).waitFor({ timeout: 30000 });
    await A.page.screenshot({ path: join(ART, 'A-discover.png') });
    await likeBtn(A.page).click(); // Alice likes the top card (Bob)
    pass('Alice swiped like');
    await A.page.waitForTimeout(1500); // let the like persist before the reverse check

    await B.page.goto(`${BASE}/discover`, { waitUntil: 'domcontentloaded' });
    await likeBtn(B.page).waitFor({ timeout: 30000 });
    await likeBtn(B.page).click(); // Bob likes Alice -> reverse like found -> Match
    await B.page.getByText("It's a Match!").waitFor({ timeout: 15000 });
    pass('"It\'s a Match!" shown to Bob (match created by real swipe)');
    await B.page.screenshot({ path: join(ART, 'B-match.png') });
    await B.page.getByRole('button', { name: /Написать/ }).click();
    await B.page.waitForURL(/\/chat\//, { timeout: 15000 });
    const matchId = B.page.url().match(/\/chat\/([^/?#]+)/)[1];
    assert(!!matchId, `landed in chat with match id from URL: ${matchId}`);

    // Post-check: the match is a REAL backend row between Alice and Bob (not a test bot).
    const realMatch = (await apiCall(
      `/entities/Match?q=${encodeURIComponent(JSON.stringify({ id: matchId }))}`,
      { token: A.token },
    ))[0];
    assert(
      realMatch &&
        [realMatch.profile_a_id, realMatch.profile_b_id].includes(A.profileId) &&
        [realMatch.profile_a_id, realMatch.profile_b_id].includes(B.profileId),
      'backend match is between the two real users (Alice & Bob)',
    );

    log('\n=== PART 3: CHAT (cross-user) ===');
    await A.page.goto(`${BASE}/chat/${matchId}`, { waitUntil: 'domcontentloaded' });
    await A.page.getByPlaceholder('Сообщение...').waitFor({ timeout: 30000 });
    const msgFromA = 'Привет, это Alice 👋';
    await A.page.getByPlaceholder('Сообщение...').fill(msgFromA);
    await A.page.getByPlaceholder('Сообщение...').press('Enter');
    await A.page.getByText(msgFromA).waitFor({ timeout: 10000 });
    pass('Alice sent a message');

    // Bob is already in the chat (arrived via the "Написать" button).
    await B.page.getByText(msgFromA).waitFor({ timeout: 15000 });
    pass('Bob received Alice\'s message (realtime/poll)');

    const msgFromB = 'Привет, Alice! Это Bob 🙂';
    await B.page.getByPlaceholder('Сообщение...').fill(msgFromB);
    await B.page.getByPlaceholder('Сообщение...').press('Enter');
    await B.page.getByText(msgFromB).waitFor({ timeout: 10000 });
    await A.page.getByText(msgFromB).waitFor({ timeout: 15000 });
    pass('Alice received Bob\'s reply (realtime/poll)');
    await A.page.screenshot({ path: join(ART, 'A-chat.png') });
    await B.page.screenshot({ path: join(ART, 'B-chat.png') });

    log('\n=== PART 4: VIDEO CALL (3-min flow + mutual continue) ===');
    await doVideoCall(A.page, 'Alice', matchId);
    await doVideoCall(B.page, 'Bob', matchId);

    const finalMatch = (await apiCall(
      `/entities/Match?q=${encodeURIComponent(JSON.stringify({ id: matchId }))}`,
      { token: A.token },
    ))[0];
    assert(finalMatch.video_result_a === 'continue', 'video_result_a = continue');
    assert(finalMatch.video_result_b === 'continue', 'video_result_b = continue');
    assert(finalMatch.status === 'video_unlocked', 'match status = video_unlocked');

    // The unlock posts a system message into the chat — verify it shows up.
    await A.page.goto(`${BASE}/chat/${matchId}`, { waitUntil: 'domcontentloaded' });
    await A.page.getByText(/разблокированы/).first().waitFor({ timeout: 15000 });
    pass('Unlock system message visible in chat');
    await A.page.screenshot({ path: join(ART, 'A-chat-unlocked.png') });

    log('\n=========================================');
    log(' ALL E2E CHECKS PASSED ✅  (AUTH · CHAT · VIDEO)');
    log('=========================================');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('\n❌ E2E FAILED:', err.message);
  process.exit(1);
});
