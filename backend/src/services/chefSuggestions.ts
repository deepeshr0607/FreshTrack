import type { ChefMatchedRecipeDetail, ChefSuggestionsData } from '../contracts/api';
import { createSpoonacularProvider, RecipeProviderFailure, validRecipeId, type RecipeProvider } from '../integrations/spoonacular';
import { createChefService, type ChefService } from './chef';
import { matchRecipeDetail, matchRecipeSummary } from '../lib/recipeMatching';
import type { VerifiedIdentity } from './auth';

export interface ChefSuggestionsService { suggest(identity: VerifiedIdentity): Promise<ChefSuggestionsData>; detail(identity: VerifiedIdentity, id: number): Promise<ChefMatchedRecipeDetail> }
export function createChefSuggestionsService(ingredients: ChefService = createChefService(), provider: RecipeProvider = createSpoonacularProvider()): ChefSuggestionsService {
  const read = async (identity: VerifiedIdentity) => {
    // Always read the current scoped window; never accept client names or reuse a Pantry snapshot.
    // One complete scoped snapshot supplies local matching; only rescue names leave the backend.
    const { pantryIngredients, ...current } = await ingredients.inventory(identity);
    const rows = current.ingredients.length ? await provider.search(current.ingredients.map(row => row.name)) : [];
    const recipes = rows.map(recipe => ({ ...recipe, match: matchRecipeSummary(recipe, pantryIngredients) }));
    const data: ChefSuggestionsData = { ...current, recipes,
      state: !current.ingredients.length ? 'NO_NEAR_EXPIRY' : recipes.length ? 'READY' : 'NO_RESULTS' };
    return { data, pantryIngredients };
  };
  return {
    async suggest(identity) { return (await read(identity)).data; },
    async detail(identity, id) {
      validRecipeId(id);
      // Re-evaluate this account's current shortlist before spending a recipe-information request.
      const { data, pantryIngredients } = await read(identity);
      if (!data.recipes.some(recipe => recipe.id === id)) throw new RecipeProviderFailure('RECIPE_NOT_AVAILABLE');
      const recipe = await provider.detail(id);
      return { ...recipe, match: matchRecipeDetail(recipe, pantryIngredients) };
    },
  };
}
