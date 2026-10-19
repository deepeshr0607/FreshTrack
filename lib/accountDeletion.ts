import type { AccountDeletionReview } from '../types/api';
// @ts-expect-error Explicit extension supports native TypeScript tests and Metro.
import { apiOrigin } from './backendIdentity.ts';
// @ts-expect-error Explicit extension supports native TypeScript tests and Metro.
import { NeonAuthError } from './neonAuth.ts';

export function createAccountDeletionApi(base: string | undefined, getToken: () => Promise<string>, allowLocalHttp = false, fetcher: typeof fetch = fetch) {
  const origin = apiOrigin(base, allowLocalHttp);
  async function request(body?: { email: string; confirmation: string }) {
    const token = await getToken();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetcher(`${origin}/api/v1/account/deletion`, { method: body ? 'POST' : 'GET',
        credentials: 'omit', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      if (!response.ok) throw new NeonAuthError(response.status === 409 ? 'SHARED_HOUSEHOLD' : 'DELETION_UNAVAILABLE',
        response.status === 409 ? 'Shared-household deletion is unavailable. Nothing was deleted.' : 'Unable to confirm account data deletion. Refresh the review and retry.');
      return await response.json() as { data?: unknown };
    } catch (error) {
      if (error instanceof NeonAuthError) throw error;
      throw new NeonAuthError('DELETION_NETWORK', 'Unable to confirm deletion. Check your connection, refresh the review and retry.');
    } finally { clearTimeout(timeout); }
  }
  return {
    async review(): Promise<AccountDeletionReview> {
      const { data } = await request(); const review = data as AccountDeletionReview | undefined;
      if (!review || !['READY', 'SHARED_HOUSEHOLD', 'DATA_DELETED'].includes(review.state) || !review.counts ||
        !['groceries', 'events', 'receipts'].every(key => Number.isSafeInteger(review.counts[key as keyof typeof review.counts]) && review.counts[key as keyof typeof review.counts] >= 0)) {
        throw new NeonAuthError('DELETION_RESPONSE', 'The account review was invalid. Nothing has been submitted.');
      }
      return review;
    },
    async removeData(email: string, confirmation: string) {
      if (confirmation !== 'DELETE' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new NeonAuthError('DELETION_CONFIRMATION', 'Type DELETE and your signed-in email.');
      const { data } = await request({ email, confirmation });
      if ((data as { state?: unknown })?.state !== 'DATA_DELETED') throw new NeonAuthError('DELETION_RESPONSE', 'Refresh the review to check whether data deletion completed.');
    },
  };
}
/** Two-stage deletion. A partial completion is explicitly retryable, never reported as success. */
export async function performAccountDeletion(input: { email: string; confirmation: string; password: string }, io: {
  review(): Promise<AccountDeletionReview>; verifyPassword(password: string): Promise<void>;
  removeData(email: string, confirmation: string): Promise<void>; clearDevice(): Promise<void>;
  deleteUser(password: string): Promise<void>; dataDeleted(): void;
}) {
  if (input.confirmation !== 'DELETE' || !input.email || input.password.length < 8 || input.password.length > 128) {
    throw new NeonAuthError('DELETION_CONFIRMATION', 'Enter your email, DELETE and your current password.');
  }
  const review = await io.review();
  if (review.state === 'SHARED_HOUSEHOLD') throw new NeonAuthError('SHARED_HOUSEHOLD', 'Shared-household deletion is unavailable. Nothing was deleted.');
  await io.verifyPassword(input.password); // Wrong password cannot erase FreshTrack data.
  if (review.state !== 'DATA_DELETED') await io.removeData(input.email, input.confirmation);
  io.dataDeleted();
  try { await io.clearDevice(); }
  catch { throw new NeonAuthError('DELETION_DEVICE', 'Your FreshTrack data is deleted and locked. Device cleanup failed; retry to finish account deletion.'); }
  try { await io.deleteUser(input.password); }
  catch (error) {
    throw new NeonAuthError(error instanceof NeonAuthError ? error.code : 'DELETION_PROVIDER',
      'Your FreshTrack data is deleted and locked. Neon account deletion is not confirmed. Retry to finish; check your email if Neon requested verification.');
  }
}
