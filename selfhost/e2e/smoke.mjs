// API-level smoke test of the self-hosted backend (no browser).
// Exercises: register -> Mailpit OTP -> verify -> login -> me -> create profile -> upload.
const BASE = process.env.BASE || 'http://localhost:5180';
const MAILPIT = process.env.MAILPIT || 'http://localhost:8026';
const APP = process.env.APP_ID || '6a1356896fdf56fa48755d68';
const api = (p) => `${BASE}/api/apps/${APP}${p}`;

let token = null;

async function call(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-App-Id': APP };
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(api(path), { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return data;
}

async function fetchOtp(email) {
  for (let i = 0; i < 30; i++) {
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
  throw new Error(`No OTP email for ${email}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ok:', msg);
}

const ts = Date.now();
const email = `smoke_${ts}@example.com`;
const password = 'secret123';

console.log('1) register', email);
await call('/auth/register', { method: 'POST', body: { email, password } });

console.log('2) read OTP from Mailpit');
const code = await fetchOtp(email);
console.log('   code =', code);

console.log('3) verify-otp');
const verified = await call('/auth/verify-otp', { method: 'POST', body: { email, otp_code: code } });
assert(verified.is_verified === true, 'user verified');

console.log('4) login');
const login = await call('/auth/login', { method: 'POST', body: { email, password } });
assert(!!login.access_token, 'got access_token');
token = login.access_token;

console.log('5) me');
const me = await call('/entities/User/me');
assert(me.email === email, 'me() returns our email');

console.log('6) create profile');
const profile = await call('/entities/Profile', {
  method: 'POST',
  body: {
    name: 'Smoke', age: 25, city: 'Москва', gender: 'male', looking_for: 'everyone',
    goal: 'relationship', interests: [], photos: ['x'], profile_complete: true,
    is_online: true, last_seen: new Date().toISOString(),
  },
});
assert(!!profile.id, 'profile created with id');
assert(profile.created_by === email, 'created_by set to our email');
assert(profile.created_date && profile.updated_date, 'has created_date/updated_date');

console.log('7) filter profile by created_by');
const mine = await call(`/entities/Profile?q=${encodeURIComponent(JSON.stringify({ created_by: email }))}`);
assert(Array.isArray(mine) && mine.length === 1, 'filter returns our profile');

console.log('8) upload a file (active storage backend)');
const png = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5b0000000049454e44ae426082',
  'hex',
);
const fd = new FormData();
fd.append('file', new Blob([png], { type: 'image/png' }), 'pixel.png');
const up = await call('/integration-endpoints/Core/UploadFile', { method: 'POST', form: fd });
assert(!!up.file_url, 'upload returned file_url: ' + up.file_url);
const fileRes = await fetch(`${BASE}${up.file_url}`);
assert(fileRes.ok, 'uploaded file is retrievable via ' + up.file_url);

console.log('\nALL SMOKE CHECKS PASSED ✅');
