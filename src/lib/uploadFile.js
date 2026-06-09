/* b44-full-sync 2026-06-01 */
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { getAuthErrorMessage } from '@/lib/authRedirect';

export function syncSdkAuthToken() {
  if (typeof window === 'undefined') return null;

  const token =
    window.localStorage.getItem('base44_access_token') ||
    window.localStorage.getItem('token');

  if (token) {
    base44.setToken(token);
  }

  return token;
}

export function getUploadErrorMessage(error) {
  if (error?.code === 'NOT_AUTHENTICATED') {
    return 'Сессия истекла. Войдите в аккаунт заново';
  }

  const status = error?.status ?? error?.response?.status;
  const message = error?.message || '';

  if (status === 401 || status === 403) {
    return getAuthErrorMessage(error) || 'Сессия истекла. Войдите в аккаунт заново';
  }
  if (status === 413) {
    return 'Файл слишком большой. Максимум 10 МБ';
  }
  if (status === 415) {
    return 'Формат файла не поддерживается';
  }
  if (message.includes('Сервер не вернул')) {
    return message;
  }

  return 'Не удалось загрузить фото. Проверьте интернет и попробуйте ещё раз';
}

async function uploadViaFetch(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/api/apps/${appParams.appId}/integration-endpoints/Core/UploadFile`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-App-Id': appParams.appId,
      },
      body: formData,
    },
  );

  let data = {};
  try {
    data = await response.json();
  } catch {
    // ignore
  }

  if (!response.ok) {
    const err = new Error(
      typeof data.message === 'string'
        ? data.message
        : typeof data.detail === 'string'
          ? data.detail
          : 'Upload failed',
    );
    err.status = response.status;
    throw err;
  }

  const file_url = data.file_url || data.url;
  if (!file_url) {
    throw new Error('Сервер не вернул ссылку на файл');
  }

  return file_url;
}

export async function uploadPublicFile(file) {
  const token = syncSdkAuthToken();
  if (!token) {
    const err = new Error('NOT_AUTHENTICATED');
    err.code = 'NOT_AUTHENTICATED';
    err.status = 401;
    throw err;
  }

  try {
    return await uploadViaFetch(file, token);
  } catch (fetchError) {
    const result = await base44.integrations.Core.UploadFile({ file });
    const file_url = result?.file_url || result?.url;
    if (!file_url) {
      throw fetchError;
    }
    return file_url;
  }
}
