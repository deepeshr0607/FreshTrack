import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireIdentity } from '../middleware/auth';
import { sendFailure, success } from '../lib/api';
import type { VerifyIdentity } from '../services/auth';
import { AccountDeletionFailure, type AccountDeletionService } from '../services/accountDeletion';

export function createAccountRouter(verify: VerifyIdentity, service: AccountDeletionService) {
  const router = Router();
  router.use('/account/deletion', requireIdentity(verify)); // Deliberately permits resuming a data-deleted account.
  router.use('/account/deletion', rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => sendFailure(req, res, 429, 'RATE_LIMITED', 'Too many account requests. Wait and retry.') }));
  router.use('/account/deletion', (req, res, next) => {
    if (req.originalUrl.includes('?') || (req.method === 'GET' && (Number(req.get('content-length') || 0) > 0 || req.get('transfer-encoding')))) {
      sendFailure(req, res, 400, 'INVALID_REQUEST', 'Account selection and query options are not accepted.'); return;
    }
    next();
  });
  router.get('/account/deletion', async (_req, res, next) => {
    try { res.json(success(await service.review(res.locals.identity))); } catch (error) { next(error); }
  });
  router.post('/account/deletion', async (req, res, next) => {
    const body = req.body;
    if (!req.is('application/json') || !body || Array.isArray(body) || Object.keys(body).length !== 2 ||
      body.confirmation !== 'DELETE' || typeof body.email !== 'string' || body.email.toLowerCase() !== res.locals.identity.email.toLowerCase()) {
      sendFailure(req, res, 400, 'INVALID_REQUEST', 'Type DELETE and your signed-in email to confirm.'); return;
    }
    try { await service.removeData(res.locals.identity); res.json(success({ state: 'DATA_DELETED' })); }
    catch (error) { next(error); }
  });
  router.use((error: Error, req: Parameters<typeof sendFailure>[0], res: Parameters<typeof sendFailure>[1], next: (error: Error) => void) => {
    if (!(error instanceof AccountDeletionFailure)) { next(error); return; }
    sendFailure(req, res, error.code === 'SHARED_HOUSEHOLD' ? 409 : 503, error.code,
      error.code === 'SHARED_HOUSEHOLD' ? 'Shared-household deletion is unavailable. No account or household data was deleted.'
        : 'Account data could not be confirmed deleted. Review the account and retry.');
  });
  return router;
}
