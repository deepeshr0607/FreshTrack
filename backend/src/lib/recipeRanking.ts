import type { ChefExpiringData, ChefSuggestionsData } from '../contracts/api';
import { canonicalIngredient } from './recipeMatching';
/** Deterministic rescue-first ordering; names/amount coverage remain distinct. */
export function rankChefRecipes(recipes: ChefSuggestionsData['recipes'], window: ChefExpiringData): ChefSuggestionsData['recipes'] {
  const urgency = new Map<string, number>();
  for (const row of window.ingredients) {
    const name = canonicalIngredient(row.name), score = row.expiresOn === window.householdDate ? 2 : 1;
    urgency.set(name, Math.max(urgency.get(name) ?? 0, score));
  }
  return recipes.map(recipe => {
    const names = [...new Set(recipe.usedIngredients.map(row => canonicalIngredient(row.name)))];
    const eligible = names.filter(name => urgency.has(name));
    return { ...recipe, rescuePriority: eligible.reduce((sum, name) => sum + urgency.get(name)!, 0), rescueIngredientCount: eligible.length };
  }).sort((a, b) => b.rescuePriority! - a.rescuePriority! || b.rescueIngredientCount! - a.rescueIngredientCount!
    || b.match.pantryNameMatchPercent - a.match.pantryNameMatchPercent || a.match.shoppingItems.length - b.match.shoppingItems.length
    || (a.metadata?.readyInMinutes ?? Infinity) - (b.metadata?.readyInMinutes ?? Infinity) || a.id - b.id);
}
