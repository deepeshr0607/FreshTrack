import type { ChefExpiringData, ChefSuggestionsData, ChefMatchedRecipeDetail, ChefIngredientMatch } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { apiOrigin } from './backendIdentity.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';

const messages: Record<string, string> = {
  HOUSEHOLD_REQUIRED: 'Open Pantry to set up your household, then return to Recipes.',
  CHEF_INVENTORY_LIMIT: 'Your Pantry is too large for a complete recipe match. Please try later.',
  CHEF_INGREDIENT_LIMIT: 'Too many rescue ingredients for one recipe search.',
  RECIPE_INGREDIENT_LIMIT: 'Some rescue ingredient names need review before recipe search.',
  RECIPE_NOT_CONFIGURED: 'The recipe service is not configured yet. Please try later.',
  RECIPE_QUOTA_EXHAUSTED: 'The daily recipe allowance is used up. Try again after the provider resets its quota.',
  RECIPE_RATE_LIMITED: 'Please wait a moment before trying recipes again.',
  RECIPE_NOT_AVAILABLE: 'This recipe is no longer in your current suggestions. Return to Recipes and refresh.',
  RECIPE_TIMEOUT: 'The recipe service took too long. Please retry.',
};
const record = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown, max = 1000): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 2147483647;
const array = (value: unknown, max: number): value is any[] => Array.isArray(value) && value.length <= max;
function ingredientWindow(value: unknown): value is ChefExpiringData {
  return record(value) && /^\d{4}-\d{2}-\d{2}$/.test(value.householdDate) && /^\d{4}-\d{2}-\d{2}$/.test(value.throughDate)
    && string(value.timezone, 64) && value.window === 'HOUSEHOLD_TODAY_AND_TOMORROW' && array(value.ingredients, 200)
    && value.ingredients.every(row => record(row) && string(row.pantryItemId, 100) && string(row.name, 120) && string(row.quantity, 30)
      && string(row.unit, 32) && /^\d{4}-\d{2}-\d{2}$/.test(row.expiresOn));
}
function matching(value: unknown): value is ChefIngredientMatch {
  return record(value) && ['SUMMARY', 'FULL_RECIPE'].includes(value.basis) && Number.isInteger(value.pantryNameMatchPercent)
    && value.pantryNameMatchPercent >= 0 && value.pantryNameMatchPercent <= 100 && array(value.ingredients, 200)
    && value.ingredients.every(row => record(row) && string(row.name, 160) && string(row.canonicalName, 160) && string(row.description, 1000)
      && ['PANTRY', 'CHECK_STAPLE', 'NO_MATCH'].includes(row.status) && ['SUFFICIENT', 'INSUFFICIENT', 'CHECK_AMOUNT', 'NOT_AVAILABLE'].includes(row.quantityStatus)
      && array(row.pantryItemIds, 1000) && row.pantryItemIds.every((entry: unknown) => string(entry, 100)))
    && array(value.shoppingItems, 200) && value.shoppingItems.every(row => record(row) && string(row.name, 160)
      && ['NO_MATCH', 'CHECK_STAPLE', 'INSUFFICIENT'].includes(row.reason) && typeof row.checkFirst === 'boolean');
}
export function recipeExternalUrl(value: unknown): string | null {
  if (!string(value, 2048)) return null;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function presentation(value: Record<string, any>) {
  return id(value.id) && string(value.title, 240) && (value.imageUrl === null || !!recipeExternalUrl(value.imageUrl))
    && value.provider === 'spoonacular' && typeof value.providerUrl === 'string' && value.providerUrl.startsWith('https://spoonacular.com/')
    && matching(value.match);
}
function suggestions(value: unknown): value is ChefSuggestionsData {
  if (!record(value)) return false;
  const candidate = value;
  return ingredientWindow(value) && ['NO_NEAR_EXPIRY', 'NO_RESULTS', 'READY'].includes(candidate.state)
    && array(candidate.recipes, 5) && candidate.recipes.every((row: unknown) => record(row) && presentation(row)
      && ['usedIngredients', 'missingIngredients'].every(key => array(row[key], 100) && row[key].every((item: unknown) => record(item) && string(item.name, 160) && string(item.description, 500))));
}
function details(value: unknown): value is ChefMatchedRecipeDetail {
  if (!record(value) || !presentation(value) || value.match.basis !== 'FULL_RECIPE') return false;
  return ['servings', 'readyInMinutes', 'preparationMinutes', 'cookingMinutes'].every(key => value[key] === null || typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0)
    && array(value.ingredients, 100) && value.ingredients.every(row => record(row) && string(row.name, 160) && string(row.description, 1000)
      && (row.amount === null || typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount >= 0) && string(row.unit, 100))
    && ['AVAILABLE', 'UNAVAILABLE'].includes(value.instructionStatus) && (value.instructions === null || string(value.instructions, 60000))
    && array(value.instructionGroups, 20) && value.instructionGroups.every(group => record(group) && (group.name === null || string(group.name, 300)) && array(group.steps, 200)
      && group.steps.every((step: unknown) => record(step) && id(step.number) && string(step.text, 10000)))
    && record(value.source) && ['name', 'credits', 'license'].every(key => value.source[key] === null || string(value.source[key], 1000))
    && (value.source.url === null || !!recipeExternalUrl(value.source.url));
}
export function createChefApi(baseUrl: string | undefined, getToken: () => Promise<string>, allowLocalHttp = false, fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, method: 'GET' | 'POST', validate: (value: unknown) => value is T, field?: string): Promise<T> {
    const origin = apiOrigin(baseUrl, allowLocalHttp), token = await getToken();
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher(origin + path, { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'POST' ? { body: '{}' } : {}), signal: controller.signal, credentials: 'omit', redirect: 'error' });
      if (!response.ok) {
        let code: unknown; try { code = (await response.json())?.error?.code; } catch { /* Do not show raw server responses. */ }
        const safeCode = typeof code === 'string' && Object.hasOwn(messages, code) ? code : `CHEF_HTTP_${response.status}`;
        throw new NeonAuthError(safeCode, messages[safeCode] ?? (response.status === 401 ? 'Your session was rejected. Sign in again.' : 'Recipes are unavailable. Please retry.'));
      }
      const body = await response.json(); const data = field ? body?.data?.[field] : body?.data;
      if (!validate(data)) throw new NeonAuthError('CHEF_RESPONSE', 'The recipe response could not be verified. Please refresh.');
      return data;
    } catch (error) {
      if (error instanceof NeonAuthError) throw error;
      throw new NeonAuthError('CHEF_NETWORK', 'Unable to reach Recipes. Check your connection and retry.');
    } finally { clearTimeout(timeout); }
  }
  return {
    ingredients: () => request('/api/v1/chef/expiring', 'GET', ingredientWindow),
    suggest: () => request('/api/v1/chef/suggestions', 'POST', suggestions),
    detail: (recipeId: string) => {
      if (!/^[1-9]\d{0,9}$/.test(recipeId) || !id(Number(recipeId))) return Promise.reject(new NeonAuthError('RECIPE_NOT_AVAILABLE', messages.RECIPE_NOT_AVAILABLE));
      return request(`/api/v1/chef/recipes/${recipeId}`, 'GET', (value): value is ChefMatchedRecipeDetail => details(value) && value.id === Number(recipeId), 'recipe');
    },
  };
}
