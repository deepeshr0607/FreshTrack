import { Router } from 'express';
import { requireIdentity } from '../middleware/auth';
import { InvalidApiInput, sendFailure, success } from '../lib/api';
import { analyticsMonth } from '../lib/analytics';
import { AnalyticsFailure, createAnalyticsService, type AnalyticsService } from '../services/analytics';
import type { VerifyIdentity, VerifiedIdentity } from '../services/auth';

export function createAnalyticsRouter(verify: VerifyIdentity, service: AnalyticsService = createAnalyticsService()) {
  const router = Router();
  router.use('/analytics', requireIdentity(verify));
  for (const series of [false, true]) router.get(series ? '/analytics/series' : '/analytics/summary', async (req, res, next) => {
    try {
      if (Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('No body accepted.');
      const query = new URL(req.originalUrl, 'http://localhost').searchParams;
      if ([...query.keys()].some(key => key !== 'month' && !(series && key === 'months')) || query.getAll('month').length > 1 || query.getAll('months').length > 1) throw new InvalidApiInput('Unsupported analytics selectors.');
      const month = query.has('month') ? analyticsMonth(query.get('month')) : undefined;
      const rawCount = query.get('months');
      if (rawCount !== null && !/^([2-9]|1[0-2])$/.test(rawCount)) throw new InvalidApiInput('Use 2 to 12 months.');
      const identity = res.locals.identity as VerifiedIdentity;
      res.json(success(await (series ? service.series(identity, month, rawCount === null ? undefined : Number(rawCount)) : service.summary(identity, month))));
    } catch (error) {
      if (!(error instanceof AnalyticsFailure)) { next(error); return; }
      sendFailure(req, res, error.code === 'HOUSEHOLD_REQUIRED' ? 409 : 503, error.code,
        error.code === 'HOUSEHOLD_REQUIRED' ? 'Set up your household before viewing analytics.' : 'Analytics are temporarily unavailable. Please retry.');
    }
  });
  return router;
}
