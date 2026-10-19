import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireIdentity } from '../middleware/auth';
import type { VerifiedIdentity, VerifyIdentity } from '../services/auth';
import { InvalidApiInput, sendFailure, success } from '../lib/api';
import { BarcodeProviderFailure, createOpenFoodFactsProvider, validLookupBarcode, type BarcodeProvider } from '../integrations/openFoodFacts';

/** Authenticated generic catalog reads; no household lookup or inventory mutation. */
export function createScannerRouter(verify: VerifyIdentity, provider: BarcodeProvider = createOpenFoodFactsProvider()) {
  const router = Router();
  router.use('/scanner', requireIdentity(verify));
  const limit = rateLimit({ windowMs: 60000, max: 12, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (_req, res) => (res.locals.identity as VerifiedIdentity).id,
    handler: (req, res) => sendFailure(req, res, 429, 'BARCODE_RATE_LIMITED', 'Please wait before looking up another barcode.') });
  router.get('/scanner/barcodes/:barcode', limit, async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?') || Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('No query or body accepted.');
      res.json(success(await provider.lookup(validLookupBarcode(req.params['barcode']))));
    } catch (error) {
      if (!(error instanceof BarcodeProviderFailure)) { next(error); return; }
      sendFailure(req, res, error.code === 'BARCODE_RATE_LIMITED' ? 429 : 503, error.code,
        error.code === 'BARCODE_NOT_CONFIGURED' ? 'Product lookup is not configured. You can enter the grocery manually.'
          : error.code === 'BARCODE_RATE_LIMITED' ? 'Please wait before looking up another barcode.'
          : 'Product lookup is temporarily unavailable. Retry or enter the grocery manually.');
    }
  });
  return router;
}
