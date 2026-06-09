/* b44-full-sync 2026-06-01 */
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

export const PASSWORD_RESET_FUNCTION_MISSING =
  'Функция отправки кода ещё не опубликована на Base44. Откройте редактор → Backend → Functions → Deploy.';

function getErrorMessage(error) {
  return (
    error?.message ||
    error?.data?.message ||
    error?.response?.data?.message ||
    ''
  );
}

export function isPasswordResetFunctionMissing(error) {
  const msg = getErrorMessage(error).toLowerCase();
  const status = error?.status ?? error?.response?.status;
  return (
    status === 404 ||
    msg.includes('not found') ||
    msg.includes('not deployed') ||
    msg.includes('function')
  );
}

export function isAlreadyVerifiedError(error) {
  const msg = getErrorMessage(error).toLowerCase();
  return msg.includes('already verified') || msg.includes('user is already verified');
}

async function invokePasswordResetFunction(functionName, payload) {
  try {
    return await base44.functions.invoke(functionName, payload);
  } catch (error) {
    if (isPasswordResetFunctionMissing(error)) {
      const missing = new Error(PASSWORD_RESET_FUNCTION_MISSING);
      missing.code = 'PASSWORD_RESET_FUNCTION_MISSING';
      throw missing;
    }
    throw error;
  }
}

async function invokePasswordResetFunctionDirect(functionName, payload) {
  const appId = appParams.appId;
  const response = await fetch(`/api/apps/${appId}/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Id': appId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data?.message || PASSWORD_RESET_FUNCTION_MISSING);
    error.status = response.status;
    error.data = data;
    if (isPasswordResetFunctionMissing(error)) {
      error.code = 'PASSWORD_RESET_FUNCTION_MISSING';
    }
    throw error;
  }

  return response.json().catch(() => ({}));
}

export async function requestPasswordResetCode(email) {
  const trimmedEmail = email.trim();
  const payload = { email: trimmedEmail };

  try {
    await invokePasswordResetFunction('requestPasswordResetCode', payload);
  } catch (error) {
    if (error.code !== 'PASSWORD_RESET_FUNCTION_MISSING') {
      throw error;
    }
    await invokePasswordResetFunctionDirect('requestPasswordResetCode', payload);
  }

  return { method: 'custom_code' };
}

export async function completePasswordReset({ email, code, newPassword }) {
  const trimmedEmail = email.trim();
  const trimmedCode = code.trim();
  const payload = {
    email: trimmedEmail,
    code: trimmedCode,
    newPassword,
  };

  try {
    await invokePasswordResetFunction('resetPasswordWithCode', payload);
  } catch (error) {
    if (error.code !== 'PASSWORD_RESET_FUNCTION_MISSING') {
      throw error;
    }
    await invokePasswordResetFunctionDirect('resetPasswordWithCode', payload);
  }
}

export function getPasswordResetDeploySteps() {
  return [
    'Откройте https://app.base44.com/apps/6a1356896fdf56fa48755d68/editor',
    'Перейдите в раздел Backend → Functions (или попросите AI в Base44 создать функции)',
    'Опубликуйте функции requestPasswordResetCode и resetPasswordWithCode из папки base44/functions/',
    'Добавьте entity PasswordResetCode из base44/entities/',
    'Нажмите Publish → Publish app',
    'Вернитесь сюда и снова нажмите «Прислать код на почту»',
  ];
}
