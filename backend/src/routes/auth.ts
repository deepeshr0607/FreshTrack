import { Router } from 'express';
import { requireIdentity } from '../middleware/auth';
import type { VerifyIdentity } from '../services/auth';

export function createAuthRouter(verify: VerifyIdentity) {
  const router = Router();
  router.get('/auth/me', requireIdentity(verify), (_req, res) => {
    // Client userId/query/body fields never select the account returned here.
    res.json({ data: { user: res.locals.identity } });
  });
  return router;
}
