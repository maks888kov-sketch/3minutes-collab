/* b44-full-sync 2026-06-01 */
import { base44 } from '@/api/base44Client';
import { pickBestProfile } from '@/lib/profileUtils';

const REMEMBERED_EMAIL_KEY = '3minutes_remembered_email';
const ONBOARDING_SEEN_KEY = '3minutes_onboarding_seen';

export function hasStoredSession() {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('base44_access_token') || localStorage.getItem('token'));
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('base44_access_token');
  localStorage.removeItem('token');
}

export function persistAuthToken(token) {
  if (typeof window === 'undefined' || !token) return;
  base44.setToken(token);
  localStorage.setItem('base44_access_token', token);
  localStorage.setItem('token', token);
}

export function saveRememberedEmail(email) {
  if (typeof window === 'undefined' || !email?.trim()) return;
  localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
}

export function getRememberedEmail() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
}

export function markOnboardingSeen() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
}

export function hasSeenOnboarding() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
}

export function shouldClearSessionOnAuthError(error) {
  const status = error?.status ?? error?.response?.status;
  if (status === 401) return true;
  if (isAppUnavailableError(error)) return false;

  const msg = (getRawErrorMessage(error) || '').toLowerCase();
  if (msg.includes('expired') || msg.includes('invalid token')) return true;

  if (status === 403) {
    const reason = error?.data?.extra_data?.reason ?? error?.response?.data?.extra_data?.reason;
    return reason === 'auth_required';
  }

  return false;
}

export function savePendingAuth(email, password) {
  sessionStorage.setItem('pending_auth_email', email);
  if (password) {
    sessionStorage.setItem('pending_auth_password', password);
  }
}

export function getPendingAuth() {
  return {
    email: sessionStorage.getItem('pending_auth_email') || '',
    password: sessionStorage.getItem('pending_auth_password') || '',
  };
}

export function clearPendingAuth() {
  sessionStorage.removeItem('pending_auth_email');
  sessionStorage.removeItem('pending_auth_password');
}

export function isEmailVerificationError(error) {
  const msg = (getRawErrorMessage(error) || '').toLowerCase();
  return msg.includes('verify') && msg.includes('email');
}

export function isAppUnavailableError(error) {
  const msg = (getRawErrorMessage(error) || '').toLowerCase();
  return msg.includes('not yet available') || msg.includes('check back later');
}

export function getAppPublishHelpText() {
  return [
    'Откройте панель Base44: https://app.base44.com',
    'Выберите проект 3Minutes (awesome-three-minute-spark)',
    'Нажмите Publish → Publish app и дождитесь успеха',
    'В Overview → App visibility выберите Public (Login required)',
    'Обновите эту страницу (Ctrl+F5) и сохраните профиль снова',
  ];
}

function getRawErrorMessage(error) {
  const data = error?.data ?? error?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof error?.message === 'string') return error.message;
  return '';
}

export async function getPostAuthPath() {
  const user = await base44.auth.me();
  const profiles = await base44.entities.Profile.filter({ created_by: user.email });
  const profile = pickBestProfile(profiles);
  if (!profile || !profile.profile_complete) {
    return '/profile-setup';
  }
  return '/discover';
}

export async function redirectAfterAuth() {
  clearPendingAuth();
  markOnboardingSeen();
  const path = await getPostAuthPath();
  window.location.replace(path);
}

const ERROR_TRANSLATIONS = {
  'Invalid email or password': 'Неверный email или пароль',
  'Incorrect email or password': 'Неверный email или пароль',
  'Invalid credentials': 'Неверный email или пароль',
  'User not found': 'Пользователь не найден',
  'Email already registered': 'Этот email уже зарегистрирован',
  'Email already exists': 'Этот email уже зарегистрирован',
  'User already exists': 'Этот email уже зарегистрирован',
  'Password is too short': 'Пароль слишком короткий',
  'Authentication required': 'Требуется вход в аккаунт',
  'You must be logged in to access this app': 'Сначала нужно войти в аккаунт',
  'Please verify your email before logging in. Check your email for the verification code.':
    'Подтвердите email — мы отправили код на почту',
  'Registration successful. Please check your email for the verification code.':
    'Регистрация прошла! Проверьте почту — там код подтверждения',
  'Invalid or expired OTP code': 'Неверный или просроченный код',
  'Invalid OTP code': 'Неверный код',
  'If an account exists with this email, you will receive a password reset link.':
    'Если аккаунт есть — на почту придёт письмо со ссылкой для смены пароля',
  'New verification code sent to your email.': 'Код подтверждения отправлен на почту',
  'Invalid or expired reset token': 'Код устарел или неверный. Запросите новый',
  'Invalid or expired OTP code': 'Неверный или просроченный код',
  'This app is not yet available. Please check back later.':
    'Приложение не опубликовано на Base44 — данные нельзя сохранить',
  'User is already verified':
    'Email уже подтверждён — для сброса пароля нужна публикация backend-функции на Base44',
  "Backend function 'requestPasswordResetCode' not found or not deployed":
    'Функция отправки кода не опубликована на Base44',
};

function translateAuthMessage(message) {
  if (!message || typeof message !== 'string') return null;

  const trimmed = message.trim();
  if (ERROR_TRANSLATIONS[trimmed]) return ERROR_TRANSLATIONS[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [en, ru] of Object.entries(ERROR_TRANSLATIONS)) {
    if (lower === en.toLowerCase()) return ru;
  }

  if (lower.includes('verify') && lower.includes('email')) {
    return 'Подтвердите email — проверьте почту, там код подтверждения';
  }
  if (lower.includes('invalid') && lower.includes('password')) return 'Неверный email или пароль';
  if (lower.includes('incorrect') && lower.includes('password')) return 'Неверный email или пароль';
  if (lower.includes('invalid') && lower.includes('otp')) return 'Неверный или просроченный код';
  if (lower.includes('already') && (lower.includes('email') || lower.includes('registered') || lower.includes('exists'))) {
    return 'Этот email уже зарегистрирован';
  }
  if (lower.includes('not yet available') || lower.includes('check back later')) {
    return 'Приложение не опубликовано на Base44 — данные нельзя сохранить';
  }
  if (lower.includes('already verified')) {
    return 'Email уже подтверждён. Код для сброса пароля отправляет backend-функция — её нужно опубликовать на Base44.';
  }
  if (lower.includes('not deployed') || lower.includes('function') && lower.includes('not found')) {
    return 'Функция отправки кода не опубликована. Откройте Base44 → Publish app.';
  }

  return null;
}

export function getAuthErrorMessage(error) {
  const status = error?.status ?? error?.response?.status;
  const data = error?.data ?? error?.response?.data;

  let message = getRawErrorMessage(error);

  if (Array.isArray(data?.detail)) {
    message = data.detail
      .map((item) => item?.msg || item?.message || (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .join('. ');
  }

  if (isEmailVerificationError(error)) {
    return 'Подтвердите email — проверьте почту, там код подтверждения';
  }

  if (isAppUnavailableError(error)) {
    return 'Приложение не опубликовано на Base44 — данные нельзя сохранить';
  }

  const translated = translateAuthMessage(message);
  if (translated) return translated;

  if (status === 401) return 'Неверный email или пароль';
  if (status === 404) return 'Сервис временно недоступен. Попробуйте позже';
  if (status === 422) return 'Проверьте правильность введённых данных';
  if (status === 409) return 'Этот email уже зарегистрирован';

  if (message) return message;

  return 'Что-то пошло не так. Попробуйте ещё раз';
}
