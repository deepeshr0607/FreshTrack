import type { ApiFailure, HouseholdResponse, IdentityResponse } from '../types/api';
// @ts-expect-error Node's native TypeScript test runner requires explicit extensions; Metro accepts them.
import { NeonAuthError, type AuthIdentity } from './neonAuth.ts';

/** Development acceptance check; the API derives identity from its own JWT verification. */
export async function checkBackendIdentity(baseUrl: string | undefined, getToken: () => Promise<string>, expected: AuthIdentity,
  allowLocalHttp = false, fetcher: typeof fetch = fetch): Promise<void> {
  let base: URL;
  try {
    base = new URL(baseUrl || '');
    const local = base.hostname === 'localhost' || base.hostname === '127.0.0.1'
      || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(base.hostname) || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(base.hostname);
    if ((base.protocol !== 'https:' && !(allowLocalHttp && base.protocol === 'http:' && local))
      || base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error();
  } catch { throw new NeonAuthError('API_CONFIG', 'Configure the development API URL before checking backend identity.'); }
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetcher(`${base.origin}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', signal: controller.signal,
    });
    if (!response.ok) throw new NeonAuthError(response.status === 401 ? 'API_UNAUTHORIZED' : 'API_UNAVAILABLE',
      response.status === 401 ? 'The API rejected this session. Sign in again.' : 'The API is unavailable. Please retry.');
    const body = await response.json() as Partial<IdentityResponse>;
    if (body.data?.user?.id !== expected.id || body.data.user.email !== expected.email) {
      throw new NeonAuthError('API_IDENTITY', 'The backend identity did not match your signed-in account.');
    }
  } catch (error) {
    if (error instanceof NeonAuthError) throw error;
    throw new NeonAuthError('API_NETWORK', 'Unable to reach the API. Check your connection and retry.');
  } finally { clearTimeout(timeout); }
}

/** Read-only acceptance probe. A scoped not-found response also confirms a completed database query. */
export async function checkBackendHousehold(baseUrl: string | undefined, getToken: () => Promise<string>, expected: AuthIdentity,
  allowLocalHttp = false, fetcher: typeof fetch = fetch): Promise<'ready' | 'not-configured'> {
  let token = '';
  await checkBackendIdentity(baseUrl, async () => { token = await getToken(); return token; }, expected, allowLocalHttp, fetcher);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${new URL(baseUrl!).origin}/api/v1/households/current`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', redirect: 'error', signal: controller.signal,
    });
    const body = await response.json() as Partial<HouseholdResponse & ApiFailure>;
    if (response.status === 404 && body.error?.code === 'HOUSEHOLD_NOT_FOUND' &&
        typeof body.error.requestId === 'string' && body.error.requestId.length > 0) return 'not-configured';
    if (!response.ok) throw new NeonAuthError(response.status === 401 ? 'API_UNAUTHORIZED' : 'API_UNAVAILABLE',
      response.status === 401 ? 'The API rejected this session. Sign in again.' : 'The household database check failed. Please retry.');
    const household = body.data?.household;
    if (!household || typeof household.id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(household.id) ||
        household.membership?.role !== 'MANAGER' || household.currencyCode !== 'INR' || household.timezone !== 'Asia/Kolkata') {
      throw new NeonAuthError('API_HOUSEHOLD', 'The household response was not valid for this development check.');
    }
    return 'ready';
  } catch (error) {
    if (error instanceof NeonAuthError) throw error;
    throw new NeonAuthError('API_NETWORK', 'Unable to complete the database check. Check your connection and retry.');
  } finally { clearTimeout(timeout); }
}
