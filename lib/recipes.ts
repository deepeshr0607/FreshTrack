import type { PantryItem, Recipe } from './mock';

export interface ShoppingItem { name: string; checked: boolean }
export interface RecipeState { shopping: ShoppingItem[]; saved: string[]; cooked: string[] }
export type RecipeAction =
  | { type: 'add'; ingredients: string[] }
  | { type: 'toggle'; name: string }
  | { type: 'clear-checked' }
  | { type: 'save'; id: string }
  | { type: 'cook'; id: string };
const key = (name: string) => name.trim().toLocaleLowerCase();

export function recipeReducer(state: RecipeState, action: RecipeAction): RecipeState {
  if (action.type === 'add') {
    const shopping = [...state.shopping];
    for (const name of action.ingredients) {
      if (key(name) && !shopping.some((item) => key(item.name) === key(name))) {
        shopping.push({ name: name.trim(), checked: false });
      }
    }
    return { ...state, shopping };
  }
  if (action.type === 'toggle') return { ...state, shopping: state.shopping.map((item) =>
    item.name === action.name ? { ...item, checked: !item.checked } : item) };
  if (action.type === 'clear-checked') return { ...state, shopping: state.shopping.filter((item) => !item.checked) };
  if (action.type === 'save') return { ...state, saved: state.saved.includes(action.id) ?
    state.saved.filter((id) => id !== action.id) : [...state.saved, action.id] };
  return state.cooked.includes(action.id) ? state : { ...state, cooked: [...state.cooked, action.id] };
}

export function recipeInventory(recipe: Recipe, items: PantryItem[]) {
  const available = items.filter((item) => recipe.pantryIds.includes(item.id) && item.status === 'ACTIVE');
  const unavailable = recipe.pantryIds.filter((id) => !available.some((item) => item.id === id))
    .map((id) => items.find((item) => item.id === id)?.name ?? 'Pantry ingredient');
  return { available, missing: [...recipe.missingIngredients, ...unavailable] };
}

export function filterRecipes(recipes: Recipe[], query: string, filter: string, saved: string[]) {
  return recipes.filter((recipe) => `${recipe.title} ${recipe.rescuesItems.join(' ')} ${recipe.missingIngredients.join(' ')}`
    .toLowerCase().includes(query.trim().toLowerCase()))
    .filter((recipe) => filter === 'Quick' ? recipe.prepMinutes <= 15 : filter === 'High Match' ?
      recipe.matchPercent >= 90 : filter === 'Saved' ? saved.includes(recipe.id) : true);
}
