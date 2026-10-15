import type { ChefRecipeDetail, ChefSuggestionsData } from '../contracts/api';
import { createSpoonacularProvider, RecipeProviderFailure, validRecipeId, type RecipeProvider } from '../integrations/spoonacular';
import { createChefService, type ChefService } from './chef';
import type { VerifiedIdentity } from './auth';

export interface ChefSuggestionsService { suggest(identity: VerifiedIdentity): Promise<ChefSuggestionsData>; detail(identity: VerifiedIdentity, id: number): Promise<ChefRecipeDetail> }
export function createChefSuggestionsService(ingredients: ChefService = createChefService(), provider: RecipeProvider = createSpoonacularProvider()): ChefSuggestionsService {
  const service: ChefSuggestionsService = { async suggest(identity) {
    // Always read the current scoped window; never accept client names or reuse a Pantry snapshot.
    const current = await ingredients.expiring(identity);
    if (!current.ingredients.length) return { ...current, recipes: [], state: 'NO_NEAR_EXPIRY' };
    const recipes = await provider.search(current.ingredients.map(row => row.name));
    return { ...current, recipes, state: recipes.length ? 'READY' : 'NO_RESULTS' };
  }, async detail(identity, id) {
    validRecipeId(id);
    // Re-evaluate this account's current shortlist before spending a recipe-information request.
    const current = await service.suggest(identity);
    if (!current.recipes.some(recipe => recipe.id === id)) throw new RecipeProviderFailure('RECIPE_NOT_AVAILABLE');
    return provider.detail(id);
  } };
  return service;
}
