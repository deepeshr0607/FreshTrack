import { Router, type Request, type Response } from 'express';
import { requireIdentity } from '../middleware/auth';
import { AuthFailure, type VerifiedIdentity, type VerifyIdentity } from '../services/auth';
import { createHouseholdService, HouseholdUnavailable, type HouseholdService } from '../services/households';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function failure(req: Request, res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message, requestId: req.headers['x-request-id'] } });
}

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
      failure(req, res, 400, 'INVALID_REQUEST', 'This endpoint does not accept request fields or query options.');
      return;
    }
    next();
  });
  router.post('/households/current', async (_req, res, next) => {
    try { res.json({ data: { household: await service.bootstrap(res.locals.identity as VerifiedIdentity) } }); }
    catch (error) { next(error); }
  });
  router.get(['/households/current', '/households/:householdId'], async (req, res, next) => {
    const id = req.params['householdId'];
    if (id !== undefined && !uuid.test(id)) {
      failure(req, res, 400, 'INVALID_HOUSEHOLD_ID', 'Provide a valid household identifier.');
      return;
    }
    try {
      const household = await service.findForIdentity(res.locals.identity as VerifiedIdentity, id?.toLowerCase());
      if (!household) { failure(req, res, 404, 'HOUSEHOLD_NOT_FOUND', 'Household not found for this account.'); return; }
      res.json({ data: { household } });
    } catch (error) { next(error); }
  });
  router.use((error: Error, req: Request, res: Response, next: (error: Error) => void) => {
    if (error instanceof HouseholdUnavailable) {
      failure(req, res, 503, 'HOUSEHOLD_UNAVAILABLE', 'Household services are temporarily unavailable. Please retry.');
    } else if (error instanceof AuthFailure) {
      res.setHeader('WWW-Authenticate', 'Bearer');
      failure(req, res, 401, 'UNAUTHORIZED', 'Sign in with a valid verified account.');
    } else { next(error); }
  });
  return router;
}
