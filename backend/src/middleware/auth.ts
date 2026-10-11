import type { RequestHandler } from 'express';
import { AuthFailure, type VerifyIdentity } from '../services/auth';

export function requireIdentity(verify: VerifyIdentity): RequestHandler {
  return async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const authorization = req.get('authorization');
      const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/);
      if (!match || authorization!.length > 8192) throw new AuthFailure();
      res.locals.identity = await verify(match[1]);
      next();
    } catch (error) {
      const unavailable = !(error instanceof AuthFailure) || error.unavailable;
      if (!unavailable) res.setHeader('WWW-Authenticate', 'Bearer');
      res.status(unavailable ? 503 : 401).json({ error: {
        code: unavailable ? 'AUTH_UNAVAILABLE' : 'UNAUTHORIZED',
        message: unavailable ? 'Authentication is temporarily unavailable. Please retry.' : 'Sign in with a valid verified account.',
        requestId: req.headers['x-request-id'],
      } });
    }
  };
}
