import type { JWTVerifyGetKey } from 'jose' with { "resolution-mode": "import" };

export interface VerifiedIdentity { id: string; email: string; name: string }
export type VerifyIdentity = (token: string) => Promise<VerifiedIdentity>;
export class AuthFailure extends Error {
  constructor(readonly unavailable = false) { super('Authentication could not be verified.'); }
}

/** Keys and expected claims come exclusively from server configuration, never token headers. */
export function createIdentityVerifier(authUrl: string | undefined, getKey?: JWTVerifyGetKey): VerifyIdentity {
  let endpoint: URL;
  try {
    endpoint = new URL(authUrl || '');
    if (endpoint.protocol !== 'https:' || !/\.neon\.(tech|com)$/.test(endpoint.hostname)
      || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error();
  } catch { return async () => { throw new AuthFailure(true); }; }
  // Preserve native import for the ESM-only jose package while keeping the existing CommonJS backend.
  const loadVerifier = () => import('jose').then(({ createRemoteJWKSet, jwtVerify }) => ({
    jwtVerify,
    key: getKey ?? createRemoteJWKSet(new URL(`${endpoint.href.replace(/\/$/, '')}/.well-known/jwks.json`), {
      timeoutDuration: 5000, cooldownDuration: 30_000, cacheMaxAge: 600_000,
    }),
  }));
  // Public health/startup must not load authentication tooling before a token is checked.
  let verifier: ReturnType<typeof loadVerifier> | undefined;
  return async (token) => {
    try {
      const { jwtVerify, key } = await (verifier ??= loadVerifier());
      const { payload } = await jwtVerify(token, key, {
        algorithms: ['EdDSA'], issuer: endpoint.origin, audience: endpoint.origin,
        requiredClaims: ['sub', 'exp', 'iat'], maxTokenAge: '15m', clockTolerance: 5,
      });
      if (typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 255
        || payload.sub.trim() !== payload.sub || /[\u0000-\u001f\u007f]/.test(payload.sub)
        || typeof payload.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
        || payload.emailVerified !== true || payload.banned === true
        || (payload.id !== undefined && payload.id !== payload.sub)) throw new AuthFailure();
      return { id: payload.sub, email: payload.email, name: typeof payload.name === 'string' ? payload.name : '' };
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      const code = (error as { code?: unknown })?.code;
      // Invalid credentials fail with 401; key-service outages fail closed with a retryable 503.
      const invalid = typeof code === 'string' && [
        'ERR_JWT_EXPIRED', 'ERR_JWT_CLAIM_VALIDATION_FAILED', 'ERR_JWT_INVALID',
        'ERR_JWS_INVALID', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED', 'ERR_JOSE_ALG_NOT_ALLOWED',
        'ERR_JWKS_NO_MATCHING_KEY', 'ERR_JOSE_NOT_SUPPORTED',
      ].includes(code);
      throw new AuthFailure(!invalid);
    }
  };
}
