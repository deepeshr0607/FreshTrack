import type { ChefSuggestionsData, ChefIngredientMatch } from '../types/api';
export function filterChefRecipes(recipes: ChefSuggestionsData['recipes'], query: string, filter: string, saved: number[]) {
  const search = query.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  return recipes.filter(recipe => `${recipe.title} ${recipe.match.ingredients.map(row => row.name).join(' ')}`.normalize('NFC').toLowerCase().includes(search))
    .filter(recipe => filter === 'Saved' ? saved.includes(recipe.id) : filter === 'High Match' ? recipe.match.pantryNameMatchPercent >= 80 : true);
}
export function matchingLabel(row: ChefIngredientMatch['ingredients'][number]) {
  if (row.status === 'CHECK_STAPLE') return 'Check your kitchen — common staple';
  if (row.status === 'NO_MATCH') return 'No exact Pantry match';
  return row.quantityStatus === 'SUFFICIENT' ? 'In Pantry — amount covered'
    : row.quantityStatus === 'INSUFFICIENT' ? 'In Pantry — more needed' : 'In Pantry — check amount and units';
}
