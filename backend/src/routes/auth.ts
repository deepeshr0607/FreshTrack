import { Router } from 'express';
import { success } from '../lib/api';
import type { ApiIdentity, IdentityResponse } from '../../../types/api';
import { requireIdentity } from '../middleware/auth';
import type { VerifyIdentity } from '../services/auth';

export function createAuthRouter(verify: VerifyIdentity) {
  const router = Router();
  router.get('/auth/me', requireIdentity(verify), (_req, res) => {
    // Client userId/query/body fields never select the account returned here.
    res.json(success({ user: res.locals.identity as ApiIdentity }) satisfies IdentityResponse);
  });
  return router;
}
