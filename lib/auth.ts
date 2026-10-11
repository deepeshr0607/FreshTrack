/** Pure validation for the local Phase 1 prototype, not production authentication. */
export interface DemoProfile { name: string; email: string }
export const DEMO_AUTH = { code: '123456', length: 6, lifetimeMs: 120_000, cooldownSeconds: 30, delayMs: 600 } as const;
export const MOCK_PROFILE: DemoProfile = { name: 'Maya Lin', email: 'maya.kitchen@freshtrack.io' };
export const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
export function validateProfile(profile: DemoProfile): string {
  if (!profile.name.trim()) return 'Enter your name.';
  if (!validEmail(profile.email)) return 'Enter a valid email address.';
  return '';
}
export function validateCredentials(email: string, password: string): string {
  if (!validEmail(email)) return 'Enter a valid email address.';
  if (password.length < 6) return 'Enter a password with at least 6 characters.';
  return '';
}
export function otpResult(code: string, issuedAt: number, now: number): 'incomplete' | 'expired' | 'invalid' | 'success' {
  if (!/^\d{6}$/.test(code)) return 'incomplete';
  if (now - issuedAt >= DEMO_AUTH.lifetimeMs) return 'expired';
  return code === DEMO_AUTH.code ? 'success' : 'invalid';
}
export function applyOtpInput(previous: string[], value: string, index: number): string[] {
  const digits = value.replace(/\D/g, '').slice(0, DEMO_AUTH.length);
  const next = [...previous];
  if (!digits) { next[index] = ''; return next; }
  // A full pasted/autofilled code replaces the entire row, regardless of focused digit.
  const start = digits.length === DEMO_AUTH.length ? 0 : index;
  [...digits].forEach((digit, offset) => { if (start + offset < next.length) next[start + offset] = digit; });
  return next;
}
