/* b44-full-sync 2026-06-01 */
export function getResetTokenFromSearch(search) {
  const params = new URLSearchParams(search);
  return (
    params.get('reset_token') ||
    params.get('token') ||
    params.get('resetToken') ||
    null
  );
}

export function getResetTokenFromLink(input) {
  const value = input?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return getResetTokenFromSearch(url.search);
  } catch {
    return value;
  }
}
