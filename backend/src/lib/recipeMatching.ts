import type { ChefExpiringData, ChefIngredientMatch, ChefRecipeDetail, ChefRecipeSummary } from '../contracts/api';

/** Deliberately small: no brand stripping, fuzzy substrings, or product-variant substitutions. */
const aliases: Record<string, string> = {
  tomatoes: 'tomato', potatoes: 'potato', onions: 'onion', eggs: 'egg', carrots: 'carrot', lemons: 'lemon', limes: 'lime',
  'red onions': 'red onion', 'spring onions': 'spring onion', scallions: 'spring onion', scallion: 'spring onion',
  aubergine: 'eggplant', brinjal: 'eggplant', eggplants: 'eggplant', 'coriander leaves': 'cilantro',
  capsicum: 'bell pepper', 'bell peppers': 'bell pepper', 'all-purpose flour': 'all purpose flour', 'plain flour': 'all purpose flour',
};
const staples = new Set(['water', 'salt', 'black pepper', 'olive oil', 'vegetable oil', 'sugar', 'all purpose flour']);
export function canonicalIngredient(value: string): string {
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  return Object.hasOwn(aliases, name) ? aliases[name]! : name;
}
type Dimension = 'MASS' | 'VOLUME' | 'COUNT';
const units: Record<string, { dimension: Dimension; factor: bigint }> = Object.create(null);
for (const [names, dimension, factor] of [
  [['g', 'gram', 'grams'], 'MASS', 1n], [['kg', 'kilogram', 'kilograms'], 'MASS', 1000n],
  [['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'], 'VOLUME', 1n], [['l', 'liter', 'liters', 'litre', 'litres'], 'VOLUME', 1000n],
  [['piece', 'pieces', 'unit', 'units'], 'COUNT', 1n],
] as const) for (const name of names) units[name] = { dimension, factor };
function quantity(value: string | number, unit: string) {
  const measure = units[unit.trim().toLowerCase()];
  // Up to six decimals are compared exactly. Unsupported precision/units need human review.
  const raw = String(value), match = raw.match(/^(\d{1,12})(?:\.(\d{1,6}))?$/);
  if (!measure || !match) return null;
  const amount = (BigInt(match[1]!) * 1000000n + BigInt((match[2] ?? '').padEnd(6, '0'))) * measure.factor;
  return amount > 0n ? { ...measure, amount } : null;
}
interface RequiredIngredient { name: string; description: string; amount: number | null; unit: string }
/** Pure, account-free matcher shared by summary/detail paths; its result is never provider-cached. */
export function matchRecipeIngredients(required: RequiredIngredient[], pantry: ChefExpiringData['ingredients'], basis: ChefIngredientMatch['basis']): ChefIngredientMatch {
  const inventory = new Map<string, ChefExpiringData['ingredients']>();
  for (const row of pantry) {
    const name = canonicalIngredient(row.name), group = inventory.get(name) ?? [];
    group.push(row); inventory.set(name, group);
  }
  // Duplicate recipe rows can use the same ingredient in several components; compare the total demand.
  const demand = new Map<string, bigint>();
  const uncertain = new Set<string>();
  for (const row of required) {
    const name = canonicalIngredient(row.name), amount = row.amount === null ? null : quantity(row.amount, row.unit);
    if (!amount) uncertain.add(name);
    else { const key = `${name}:${amount.dimension}`; demand.set(key, (demand.get(key) ?? 0n) + amount.amount); }
  }
  const ingredients: ChefIngredientMatch['ingredients'] = required.map(row => {
    const name = canonicalIngredient(row.name), matches = inventory.get(name) ?? [];
    const status = matches.length ? 'PANTRY' : staples.has(name) ? 'CHECK_STAPLE' : 'NO_MATCH';
    let quantityStatus: ChefIngredientMatch['ingredients'][number]['quantityStatus'] = matches.length ? 'CHECK_AMOUNT' : 'NOT_AVAILABLE';
    const needed = row.amount === null ? null : quantity(row.amount, row.unit);
    if (matches.length && needed && !uncertain.has(name)) {
      const supplies = matches.map(item => quantity(item.quantity, item.unit));
      const known = supplies.filter(item => item?.dimension === needed.dimension);
      const available = known.reduce((sum, item) => sum + item!.amount, 0n);
      const neededTotal = demand.get(`${name}:${needed.dimension}`)!;
      if (available >= neededTotal) quantityStatus = 'SUFFICIENT';
      else if (supplies.every(item => item?.dimension === needed.dimension)) quantityStatus = 'INSUFFICIENT';
    }
    return { name: row.name, canonicalName: name, description: row.description, status,
      pantryItemIds: [...new Set(matches.map(item => item.pantryItemId))].sort(), quantityStatus };
  });
  const shopping = new Map<string, ChefIngredientMatch['shoppingItems'][number]>();
  for (const row of ingredients) {
    const reason = row.status === 'NO_MATCH' ? 'NO_MATCH' : row.status === 'CHECK_STAPLE' ? 'CHECK_STAPLE'
      : row.quantityStatus === 'INSUFFICIENT' ? 'INSUFFICIENT' : null;
    if (!reason) continue;
    shopping.set(row.canonicalName, { name: row.canonicalName, reason, checkFirst: reason === 'CHECK_STAPLE' });
  }
  const matched = ingredients.filter(row => row.status === 'PANTRY').length;
  return { basis, ingredients, shoppingItems: [...shopping.values()],
    pantryNameMatchPercent: ingredients.length ? Math.round(matched * 100 / ingredients.length) : 0 };
}
export function matchRecipeSummary(recipe: ChefRecipeSummary, pantry: ChefExpiringData['ingredients']) {
  return matchRecipeIngredients([...recipe.usedIngredients, ...recipe.missingIngredients].map(row => ({ ...row, amount: null, unit: '' })), pantry, 'SUMMARY');
}
export function matchRecipeDetail(recipe: ChefRecipeDetail, pantry: ChefExpiringData['ingredients']) {
  return matchRecipeIngredients(recipe.ingredients, pantry, 'FULL_RECIPE');
}
