import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RecipeProviderFailure } from '../integrations/spoonacular';
import { createChefSuggestionsService, type ChefSuggestionsService } from '../services/chefSuggestions';
import { InvalidApiInput, sendFailure, success } from '../lib/api';
import { requireIdentity } from '../middleware/auth';
import type { VerifiedIdentity, VerifyIdentity } from '../services/auth';
import { ChefFailure, createChefService, type ChefService } from '../services/chef';

export function createChefRouter(verify: VerifyIdentity, service: ChefService = createChefService(), suggestions?: ChefSuggestionsService) {
  const router = Router();
  router.use('/chef', requireIdentity(verify));
  const recommendations = suggestions ?? createChefSuggestionsService(service);
  const suggestionLimit = rateLimit({ windowMs: 60000, max: 6, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (_req, res) => (res.locals.identity as VerifiedIdentity).id,
    handler: (req, res) => sendFailure(req, res, 429, 'RECIPE_RATE_LIMITED', 'Please wait before requesting more recipes.') });
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
  router.post('/chef/suggestions', suggestionLimit, async (req, res, next) => {
    try {
      if (req.originalUrl.includes('?') || !req.is('application/json') || !req.body || Array.isArray(req.body) ||
          typeof req.body !== 'object' || Object.keys(req.body).length) throw new InvalidApiInput('Send an empty JSON object.');
      res.json(success(await recommendations.suggest(res.locals.identity as VerifiedIdentity)));
    } catch (error) { next(error); }
  });
  router.get('/chef/recipes/:recipeId', suggestionLimit, async (req, res, next) => {
    try {
      const raw = req.params['recipeId'];
      if (!raw || !/^[1-9]\d{0,9}$/.test(raw) || Number(raw) > 2147483647 || req.originalUrl.includes('?') ||
          Number(req.get('content-length') || 0) || req.get('transfer-encoding')) throw new InvalidApiInput('Invalid recipe detail request.');
      res.json(success({ recipe: await recommendations.detail(res.locals.identity as VerifiedIdentity, Number(raw)) }));
    } catch (error) { next(error); }
  });
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      if (error instanceof RecipeProviderFailure) {
        const code = error.code;
        const message = code === 'RECIPE_NOT_AVAILABLE' ? 'This recipe is not available in your current suggestions. Refresh recipes and choose again.'
          : code === 'RECIPE_NOT_CONFIGURED' ? 'Recipe service credentials are unavailable. Please try later.'
          : code === 'RECIPE_QUOTA_EXHAUSTED' ? 'Recipe suggestions have reached the daily service limit. Please try tomorrow.'
          : code === 'RECIPE_RATE_LIMITED' ? 'Please wait before requesting more recipes.'
          : code === 'RECIPE_INGREDIENT_LIMIT' ? 'Too many or unsupported ingredient names for one recipe search.'
          : 'Recipe suggestions are temporarily unavailable. Please retry.';
        sendFailure(req, res, code === 'RECIPE_NOT_AVAILABLE' ? 404 : code === 'RECIPE_RATE_LIMITED' ? 429 : code === 'RECIPE_TIMEOUT' ? 504 : 503, code, message);
      } else if (error instanceof ChefFailure) {
        sendFailure(req, res, error.code === 'HOUSEHOLD_REQUIRED' ? 409 : 503, error.code,
          error.code === 'HOUSEHOLD_REQUIRED' ? 'Set up your household before using AI Chef.' : 'AI Chef ingredients are temporarily unavailable. Please retry.');
      } else next(error);
  });
  return router;
}
