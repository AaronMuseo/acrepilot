import type { SyncTransport } from './sync';
export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export async function request(path: string, body?: unknown, token?: string) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${apiUrl}/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      const known = ['INVALID_LOGIN', 'LOGIN_COOLDOWN', 'REAUTH_REQUIRED', 'RESEND_COOLDOWN', 'INVALID_OR_EXPIRED_CODE', 'INVALID_INPUT'];
      throw new Error(known.includes(detail.code) ? detail.code : response.status === 401 ? 'UNAUTHORIZED' : 'REQUEST_FAILED');
    }
    return await response.json();
  } finally { clearTimeout(timer); }
}
export const transport = (token: string): SyncTransport => ({
  push: operations => request('sync/push', { operations }, token),
  pull: cursor => request(`sync/pull?cursor=${cursor}`, undefined, token),
});
