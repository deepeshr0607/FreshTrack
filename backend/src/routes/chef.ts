import { Router } from 'express';
import { InvalidApiInput, sendFailure, success } from '../lib/api';
import { requireIdentity } from '../middleware/auth';
import type { VerifiedIdentity, VerifyIdentity } from '../services/auth';
import { ChefFailure, createChefService, type ChefService } from '../services/chef';

export function createChefRouter(verify: VerifyIdentity, service: ChefService = createChefService()) {
  const router = Router();
  router.use('/chef', requireIdentity(verify));
  router.get('/chef/expiring', async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?') || Number(req.get('content-length') || 0) || req.get('transfer-encoding')) {
        throw new InvalidApiInput('No query or body accepted.');
      }
      res.json(success(await service.expiring(res.locals.identity as VerifiedIdentity)));
    } catch (error) {
      if (!(error instanceof ChefFailure)) { next(error); return; }
      const message = error.code === 'HOUSEHOLD_REQUIRED' ? 'Set up your household before using AI Chef.'
        : error.code === 'CHEF_INGREDIENT_LIMIT' ? 'Too many near-expiry ingredients to review in one request.'
        : 'AI Chef ingredients are temporarily unavailable. Please retry.';
      sendFailure(req, res, error.code === 'HOUSEHOLD_REQUIRED' ? 409 : 503, error.code, message);
    }
  });
  return router;
}
