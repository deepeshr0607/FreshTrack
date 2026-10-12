import { Router, type Request, type Response, type NextFunction } from 'express';
import { InvalidApiInput, parsePagination, sendFailure, success } from '../lib/api';
import { requireIdentity } from '../middleware/auth';
import type { VerifiedIdentity, VerifyIdentity } from '../services/auth';
import { createPantryService, pantryInput, pantryEditInput, pantryOutcomeInput, PantryFailure, type PantryService } from '../services/pantry';

export function createPantryRouter(verify: VerifyIdentity, service: PantryService = createPantryService()) {
  const router = Router();
  router.use('/pantry', requireIdentity(verify));
  const mutationRequest = (req: Request) => {
    const id = req.params['itemId']; const key = req.get('Idempotency-Key');
    if (!id || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !key ||
        !/^[A-Za-z0-9_-]{16,100}$/.test(key) || req.originalUrl.includes('?') || !req.is('application/json')) throw new InvalidApiInput('Invalid item mutation request.');
    return { id: id.toLowerCase(), key };
  };
  router.patch('/pantry/:itemId', async (req, res, next) => {
    try {
      const { id, key } = mutationRequest(req);
      res.json(success({ item: await service.edit(res.locals.identity as VerifiedIdentity, id, pantryEditInput(req.body), key) }));
    } catch (error) { next(error); }
  });
  for (const action of ['consume', 'waste'] as const) router.post(`/pantry/:itemId/${action}`, async (req, res, next) => {
    try {
      const { id, key } = mutationRequest(req);
      res.json(success({ item: await service.outcome(res.locals.identity as VerifiedIdentity, id, action, pantryOutcomeInput(req.body), key) }));
    } catch (error) { next(error); }
  });
  router.get('/pantry', async (req, res, next) => {
    try {
      if (Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('No body accepted.');
      const query = new URLSearchParams(req.originalUrl.split('?')[1] || '');
      res.json(success(await service.list(res.locals.identity as VerifiedIdentity, parsePagination(query))));
    } catch (error) { next(error); }
  });
  router.post('/pantry', async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?') || !req.is('application/json')) throw new InvalidApiInput('Use a JSON entry without query fields.');
      const key = req.get('Idempotency-Key');
      if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new InvalidApiInput('Provide a valid retry key.');
      res.json(success({ item: await service.create(res.locals.identity as VerifiedIdentity, pantryInput(req.body), key) }));
    } catch (error) { next(error); }
  });
  router.get('/pantry/:itemId', async (req, res, next) => {
    try {
      const id = req.params['itemId'];
      if (!id || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || req.originalUrl.includes('?') ||
          Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('Invalid item request.');
      res.json(success({ item: await service.find(res.locals.identity as VerifiedIdentity, id.toLowerCase()) }));
    } catch (error) { next(error); }
  });
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (!(error instanceof PantryFailure)) { next(error); return; }
    const status = error.code === 'PANTRY_UNAVAILABLE' ? 503 : error.code === 'ITEM_NOT_FOUND' ? 404 : 409;
    const message = error.code === 'HOUSEHOLD_REQUIRED' ? 'Set up your household before using the pantry.'
      : error.code === 'ITEM_NOT_FOUND' ? 'Item not found for this household.'
      : error.code === 'IDEMPOTENCY_CONFLICT' ? 'This retry key was already used for a different entry.'
      : error.code === 'ITEM_CHANGED' ? 'This item changed. Reload it before saving or confirming an outcome.'
      : error.code === 'ITEM_RESOLVED' ? 'This item already has a confirmed outcome.'
      : 'Pantry services are temporarily unavailable. Please retry.';
    sendFailure(req, res, status, error.code, message);
  });
  return router;
}
