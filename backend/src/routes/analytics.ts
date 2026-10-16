import { Router } from 'express';
import { requireIdentity } from '../middleware/auth';
import { InvalidApiInput, sendFailure, success } from '../lib/api';
import { analyticsMonth } from '../lib/analytics';
import { AnalyticsFailure, createAnalyticsService, type AnalyticsService } from '../services/analytics';
import type { VerifyIdentity, VerifiedIdentity } from '../services/auth';

export function createAnalyticsRouter(verify: VerifyIdentity, service: AnalyticsService = createAnalyticsService()) {
  const router = Router();
  router.use('/analytics', requireIdentity(verify));
  router.get('/analytics/summary', async (req, res, next) => {
    try {
      if (Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('No body accepted.');
      const query = new URL(req.originalUrl, 'http://localhost').searchParams;
      if ([...query.keys()].some(key => key !== 'month') || query.getAll('month').length > 1) throw new InvalidApiInput('Only one month accepted.');
      const month = query.has('month') ? analyticsMonth(query.get('month')) : undefined;
      res.json(success(await service.summary(res.locals.identity as VerifiedIdentity, month)));
    } catch (error) {
      if (!(error instanceof AnalyticsFailure)) { next(error); return; }
      sendFailure(req, res, error.code === 'HOUSEHOLD_REQUIRED' ? 409 : 503, error.code,
        error.code === 'HOUSEHOLD_REQUIRED' ? 'Set up your household before viewing analytics.' : 'Analytics are temporarily unavailable. Please retry.');
    }
  });
  return router;
}
