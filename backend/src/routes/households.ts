import { AccountDeletionFailure } from '../services/accountDeletion';
import { Router, type Request, type Response } from 'express';
import { sendFailure, success } from '../lib/api';
import type { HouseholdResponse } from '../contracts/api';
import { requireIdentity } from '../middleware/auth';
import { AuthFailure, type VerifiedIdentity, type VerifyIdentity } from '../services/auth';
import { createHouseholdService, HouseholdUnavailable, type HouseholdService } from '../services/households';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createHouseholdRouter(verify: VerifyIdentity, service: HouseholdService = createHouseholdService()) {
  const router = Router();
  router.use('/households', requireIdentity(verify));
  // No client identity, household settings, query options or extra payload fields are accepted here.
  router.use('/households', (req, res, next) => {
    const hasBody = Number(req.get('content-length') || 0) > 0 || Boolean(req.get('transfer-encoding'));
    const hasQuery = req.originalUrl.includes('?') && req.originalUrl.split('?')[1].length > 0;
    const emptyJson = Boolean(req.is('application/json')) && req.body && typeof req.body === 'object' &&
      !Array.isArray(req.body) && Object.keys(req.body).length === 0;
    if (hasQuery || Object.keys(req.query).length || (hasBody && (req.method !== 'POST' || !emptyJson))) {
      sendFailure(req, res, 400, 'INVALID_REQUEST', 'This endpoint does not accept request fields or query options.');
      return;
    }
    next();
  });
  router.post('/households/current', async (_req, res, next) => {
    try { res.json(success({ household: await service.bootstrap(res.locals.identity as VerifiedIdentity) }) satisfies HouseholdResponse); }
    catch (error) { next(error); }
  });
  router.get(['/households/current', '/households/:householdId'], async (req, res, next) => {
    const id = req.params['householdId'];
    if (id !== undefined && !uuid.test(id)) {
      sendFailure(req, res, 400, 'INVALID_HOUSEHOLD_ID', 'Provide a valid household identifier.');
      return;
    }
    try {
      const household = await service.findForIdentity(res.locals.identity as VerifiedIdentity, id?.toLowerCase());
      if (!household) { sendFailure(req, res, 404, 'HOUSEHOLD_NOT_FOUND', 'Household not found for this account.'); return; }
      res.json(success({ household }) satisfies HouseholdResponse);
    } catch (error) { next(error); }
  });
  router.use((error: Error, req: Request, res: Response, next: (error: Error) => void) => {
    if (error instanceof AccountDeletionFailure) {
      sendFailure(req, res, 403, 'ACCOUNT_DATA_DELETED', 'Account data was deleted. Open Settings to finish account deletion.');
    } else if (error instanceof HouseholdUnavailable) {
      sendFailure(req, res, 503, 'HOUSEHOLD_UNAVAILABLE', 'Household services are temporarily unavailable. Please retry.');
    } else if (error instanceof AuthFailure) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      sendFailure(req, res, 401, 'UNAUTHORIZED', 'Sign in with a valid verified account.');
    } else { next(error); }
  });
  return router;
}
