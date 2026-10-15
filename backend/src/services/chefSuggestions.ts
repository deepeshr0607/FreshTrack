import type { ChefSuggestionsData } from '../contracts/api';
import { createSpoonacularProvider, type RecipeProvider } from '../integrations/spoonacular';
import { createChefService, type ChefService } from './chef';
import type { VerifiedIdentity } from './auth';

export interface ChefSuggestionsService { suggest(identity: VerifiedIdentity): Promise<ChefSuggestionsData> }
export function createChefSuggestionsService(ingredients: ChefService = createChefService(), provider: RecipeProvider = createSpoonacularProvider()): ChefSuggestionsService {
  return { async suggest(identity) {
    // Always read the current scoped window; never accept client names or reuse a Pantry snapshot.
    const current = await ingredients.expiring(identity);
    if (!current.ingredients.length) return { ...current, recipes: [], state: 'NO_NEAR_EXPIRY' };
    const recipes = await provider.search(current.ingredients.map(row => row.name));
    return { ...current, recipes, state: recipes.length ? 'READY' : 'NO_RESULTS' };
  } };
}
