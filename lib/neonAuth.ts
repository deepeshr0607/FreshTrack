/** Limited Phase 2 native proof of concept. Never log request bodies or session tokens. */
export interface AuthStorage {
  get(): Promise<string | null>;
  set(cookie: string, persist?: boolean): Promise<void>;
  clear(): Promise<void>;
}
export interface AuthIdentity { id: string; email: string; name: string }
export class NeonAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
const messages: Record<string, string> = {
  INVALID_OTP: 'That code is incorrect or expired. Check your email or request another code.',
  OTP_EXPIRED: 'That code has expired. Request another code.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait before requesting another code.',
  ACCOUNT_UNAVAILABLE: 'This account is unavailable. Contact support before signing in again.',
  INVALID_ORIGIN: 'This app origin is not allowed by the development Auth configuration.',
  MISSING_OR_NULL_ORIGIN: 'The Auth service requires the FreshTrack app origin for this action.',
  EMAIL_NOT_VERIFIED: 'Verify your email before signing in. Request a verification code below.',
  INVALID_EMAIL_OR_PASSWORD: 'Email or password is incorrect. Try again.',
  USER_ALREADY_EXISTS: 'An account already exists for this email. Log in or verify your email.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account already exists for this email. Log in or verify your email.',
  PASSWORD_TOO_SHORT: 'Use a password with at least 8 characters.',
  PASSWORD_TOO_LONG: 'Use a password with no more than 128 characters.',
  USER_NOT_FOUND: 'This account is unavailable. Check the development Auth sign-up settings.',
};
interface AuthResponse { code?: unknown; user?: unknown; session?: unknown; status?: unknown; token?: unknown }
function identity(value: unknown): AuthIdentity {
  const user = value as Partial<AuthIdentity> | null;
  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') {
    throw new NeonAuthError('INVALID_RESPONSE', 'The Auth service returned an unexpected response.');
  }
  return { id: user.id, email: user.email, name: typeof user.name === 'string' ? user.name : '' };
}
/** Preserve the provider's signed/encoded cookie verbatim; never manufacture a cookie from the raw token. */
export function sessionCookie(headers: Headers): string | null {
  const values = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie') || ''];
  for (const header of values) {
    // Expires contains a comma; only split before another cookie name followed by '='.
    for (const part of header.split(/,(?=\s*[^=;,\s]+=)/)) {
      const [pair, ...attributes] = part.trim().split(';');
      const match = pair.match(/^(__Secure-neon-auth\.session_token|neon-auth\.session_token)=([^\s;,]+)$/);
      if (!match || attributes.some((attribute) => /^\s*max-age\s*=\s*0\s*$/i.test(attribute))) continue;
      const expiry = attributes.find((attribute) => /^\s*expires=/i.test(attribute));
      if (expiry && Date.parse(expiry.slice(expiry.indexOf('=') + 1)) <= Date.now()) continue;
      return `${match[1]}=${match[2]}`;
    }
  }
  return null;
}
export function createNeonAuth(baseUrl: string, storage: AuthStorage, fetcher: typeof fetch = fetch, appOrigin?: string) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || !/\.neon\.(tech|com)$/.test(base.hostname) || base.username || base.password || base.search || base.hash) {
    throw new NeonAuthError('CONFIG', 'Configure the development Neon Auth HTTPS URL.');
  }
  const origin = appOrigin ? new URL(appOrigin) : null;
  if (!origin || !['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
    throw new NeonAuthError('CONFIG', 'Configure the actual development app HTTP/HTTPS origin in the Neon allowlist.');
  }
  const requestOrigin = origin.origin;
  async function request(path: string, body?: object, cookie?: string): Promise<{ data: AuthResponse | null; cookie: string | null }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/${path}`, {
        method: body ? 'POST' : 'GET', credentials: 'omit', redirect: 'error', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Origin: requestOrigin, Referer: `${requestOrigin}/`, ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      // A gateway or rate limiter may return text/HTML. Preserve HTTP failures without exposing it.
      let data: AuthResponse | null = null;
      try {
        const parsed: unknown = await response.json();
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as AuthResponse;
        else if (parsed !== null && response.ok) throw new NeonAuthError('INVALID_RESPONSE', 'The Auth service returned an unexpected response.');
      } catch (error) {
        if (response.ok) throw error instanceof NeonAuthError ? error
          : new NeonAuthError('INVALID_RESPONSE', 'The Auth service returned an unexpected response.');
      }
      if (!response.ok) {
        const providerCode = typeof data?.code === 'string' ? data.code : '';
        const code = response.status === 429 ? 'TOO_MANY_ATTEMPTS'
          : Object.hasOwn(messages, providerCode) ? providerCode : `HTTP_${response.status}`;
        const message = response.status === 429 ? messages.TOO_MANY_ATTEMPTS
          : messages[code] || (response.status === 401 ? 'Your session has expired. Sign in again.' : 'Authentication failed. Check your details and try again.');
        throw new NeonAuthError(response.status === 401 && !messages[code] ? 'UNAUTHORIZED' : code, message);
      }
      return { data, cookie: sessionCookie(response.headers) };
    } catch (error) {
      if (error instanceof NeonAuthError) throw error;
      throw new NeonAuthError('NETWORK', 'Unable to reach authentication. Check your connection and try again.');
    } finally { clearTimeout(timeout); }
  }
  function validateEmail(email: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new NeonAuthError('EMAIL', 'Enter a valid email address.');
  }
  function validatePassword(password: string) {
    if (password.length < 8 || password.length > 128) throw new NeonAuthError('PASSWORD', 'Use a password with 8–128 characters.');
  }
  function verifiedIdentity(value: unknown) {
    const user = identity(value);
    if ((value as { emailVerified?: unknown }).emailVerified !== true) throw new NeonAuthError('EMAIL_NOT_VERIFIED', messages.EMAIL_NOT_VERIFIED);
    if ((value as { banned?: unknown }).banned === true) throw new NeonAuthError('ACCOUNT_UNAVAILABLE', messages.ACCOUNT_UNAVAILABLE);
    return user;
  }
  async function saveSession(cookie: string | null, persist = true) {
    if (!cookie) throw new NeonAuthError('COOKIE', 'Authentication succeeded, but the native response did not expose the session cookie. Please log in again.');
    try { await storage.set(cookie, persist); }
    catch {
      // Avoid leaving an active provider session when secure persistence fails.
      await request('sign-out', {}, cookie).catch(() => undefined);
      throw new NeonAuthError('STORAGE', 'Unable to save the session securely. Please try again.');
    }
  }
  return {
    /** Short-lived API JWT, held only for the current request; never persist or expose in UI state. */
    async getApiToken(): Promise<string> {
      const cookie = await storage.get();
      if (!cookie) throw new NeonAuthError('UNAUTHORIZED', 'Sign in before checking backend identity.');
      const { data, cookie: renewedCookie } = await request('token', undefined, cookie);
      if (renewedCookie && renewedCookie !== cookie) await storage.set(renewedCookie);
      if (typeof data?.token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(data.token)) {
        throw new NeonAuthError('INVALID_RESPONSE', 'The Auth service did not return an API token.');
      }
      return data.token;
    },
    async signUp(name: string, email: string, password: string) {
      validateEmail(email); validatePassword(password);
      if (!name.trim()) throw new NeonAuthError('NAME', 'Enter your name.');
      // Neon sends the verification code at sign-up. Do not issue a second code automatically.
      const { data } = await request('sign-up/email', { name: name.trim(), email, password });
      identity(data?.user);
      if ((data?.user as { emailVerified?: unknown }).emailVerified !== false) {
        throw new NeonAuthError('CONFIG', 'This branch must require email verification codes at sign-up.');
      }
      // An unverified sign-up response never becomes a locally authenticated session.
    },
    async sendVerificationOtp(email: string) {
      validateEmail(email);
      await request('email-otp/send-verification-otp', { email, type: 'email-verification' });
    },
    async verifyEmail(email: string, otp: string): Promise<AuthIdentity | null> {
      validateEmail(email);
      if (!/^\d{6}$/.test(otp)) throw new NeonAuthError('OTP', 'Enter all six digits.');
      const { data, cookie } = await request('email-otp/verify-email', { email, otp });
      if (data?.status !== true) throw new NeonAuthError('INVALID_RESPONSE', 'Email verification could not be confirmed.');
      const user = verifiedIdentity(data.user);
      // Some branches disable auto-sign-in. Verification then finishes at the password login form.
      if (!cookie) return null;
      await saveSession(cookie);
      return user;
    },
    async signIn(email: string, password: string, rememberMe: boolean) {
      validateEmail(email); validatePassword(password);
      const { data, cookie } = await request('sign-in/email', { email, password, rememberMe });
      const user = verifiedIdentity(data?.user);
      await saveSession(cookie, rememberMe);
      return user;
    },
    async sendOtp(email: string) {
      validateEmail(email);
      await request('email-otp/send-verification-otp', { email, type: 'sign-in' });
    },
    async verifyOtp(email: string, otp: string, name: string) {
      validateEmail(email);
      if (!/^\d{6}$/.test(otp)) throw new NeonAuthError('OTP', 'Enter all six digits.');
      const { data, cookie } = await request('sign-in/email-otp', { email, otp, name });
      const user = verifiedIdentity(data?.user);
      await saveSession(cookie);
      return user;
    },
    async getSession(): Promise<AuthIdentity | null> {
      const cookie = await storage.get();
      if (!cookie) return null;
      if (!/^(__Secure-neon-auth\.session_token|neon-auth\.session_token)=[^\s;,]+$/.test(cookie)) { await storage.clear(); return null; }
      try {
        const { data, cookie: renewedCookie } = await request('get-session', undefined, cookie);
        if (!data?.session) { await storage.clear(); return null; }
        if (renewedCookie && renewedCookie !== cookie) await storage.set(renewedCookie);
        return verifiedIdentity(data.user);
      } catch (error) {
        if (error instanceof NeonAuthError && ['UNAUTHORIZED', 'EMAIL_NOT_VERIFIED', 'ACCOUNT_UNAVAILABLE'].includes(error.code)) {
          await storage.clear(); return null;
        }
        throw error; // Retain secure material on temporary network failure so restoration can retry.
      }
    },
    async signOut() {
      const cookie = await storage.get();
      if (cookie) {
        try { await request('sign-out', {}, cookie); }
        catch (error) { if (!(error instanceof NeonAuthError && error.code === 'UNAUTHORIZED')) throw error; }
      }
      await storage.clear();
    },
  };
}
