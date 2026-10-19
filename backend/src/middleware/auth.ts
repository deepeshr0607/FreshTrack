import { AccountDeletionFailure } from '../services/accountDeletion';
import type { RequestHandler } from 'express';
import { sendFailure } from '../lib/api';
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
      if (error instanceof AccountDeletionFailure && error.code === 'ACCOUNT_DATA_DELETED') {
        sendFailure(req, res, 403, error.code, 'Account data was deleted. Open Settings to finish account deletion.'); return;
      }
      const unavailable = !(error instanceof AuthFailure) || error.unavailable;
      if (!unavailable) res.setHeader('WWW-Authenticate', 'Bearer');
      sendFailure(req, res, unavailable ? 503 : 401, unavailable ? 'AUTH_UNAVAILABLE' : 'UNAUTHORIZED',
        unavailable ? 'Authentication is temporarily unavailable. Please retry.' : 'Sign in with a valid verified account.');
    }
  };
}
