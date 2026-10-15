import type { ChefRecipeSummary } from '../contracts/api';

export class RecipeProviderFailure extends Error {
  constructor(readonly code: 'RECIPE_NOT_CONFIGURED' | 'RECIPE_QUOTA_EXHAUSTED' | 'RECIPE_RATE_LIMITED' | 'RECIPE_TIMEOUT' | 'RECIPE_UNAVAILABLE' | 'RECIPE_INGREDIENT_LIMIT') { super(code); }
}
export interface RecipeProvider { search(names: string[]): Promise<ChefRecipeSummary[]> }
const normalize = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
/** Names only: this endpoint does not accept quantities, identity, purchase values or the full Pantry. */
export function recipeSearchNames(names: string[]) {
  const values = [...new Set(names.map(normalize))].sort();
  if (values.length > 20 || values.some(name => !name || name.length > 120 || /[,\u0000-\u001f\u007f]/.test(name)) || values.join(',').length > 1000) {
    throw new RecipeProviderFailure('RECIPE_INGREDIENT_LIMIT');
  }
  return values;
}
const invalid = () => new RecipeProviderFailure('RECIPE_UNAVAILABLE');
function text(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u001f\u007f<>]/.test(value)) throw invalid();
  return value.normalize('NFC').trim().replace(/\s+/g, ' ');
}
function ingredients(value: unknown) {
  if (!Array.isArray(value) || value.length > 100) throw invalid();
  return value.map(row => {
    if (!row || typeof row !== 'object') throw invalid();
    return { name: text(row.name, 160), description: text(row.original, 500) };
  });
}
export function parseRecipeSummaries(value: unknown): ChefRecipeSummary[] {
  if (!Array.isArray(value) || value.length > 5) throw invalid();
  const ids = new Set<number>();
  return value.map(row => {
    if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id)) throw invalid();
    ids.add(row.id);
    const title = text(row.title, 240), used = ingredients(row.usedIngredients), missing = ingredients(row.missedIngredients);
    if (row.usedIngredientCount !== used.length || row.missedIngredientCount !== missing.length) throw invalid();
    let imageUrl: string | null = null;
    if (row.image) {
      const image = new URL(text(row.image, 1024));
      if (image.protocol !== 'https:' || !['img.spoonacular.com', 'images.spoonacular.com'].includes(image.hostname) || image.username || image.password || image.port) throw invalid();
      imageUrl = image.href;
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
    return { id: row.id, title, imageUrl, usedIngredients: used, missingIngredients: missing,
      provider: 'spoonacular' as const, providerUrl: `https://spoonacular.com/recipes/${slug}-${row.id}` };
  }).filter(row => row.usedIngredients.length > 0)
    .sort((a, b) => b.usedIngredients.length - a.usedIngredients.length || a.missingIngredients.length - b.missingIngredients.length || a.id - b.id);
}
/** Bounded process-local caching/rate protection; serverless instances do not share this state. */
export function createSpoonacularProvider(options: { key?: () => string | undefined; fetch?: typeof fetch; now?: () => number } = {}): RecipeProvider {
  const getKey = options.key ?? (() => process.env['SPOONACULAR_API_KEY']);
  const transport = options.fetch ?? fetch, now = options.now ?? Date.now;
  const cache = new Map<string, { rows: ChefRecipeSummary[]; timer: ReturnType<typeof setTimeout>; until: number }>();
  const pending = new Map<string, Promise<ChefRecipeSummary[]>>();
  let configuredKey = '', blockedUntil = 0, nextRequest = 0, rejectedKey = false;
  const clearCache = () => { for (const entry of cache.values()) clearTimeout(entry.timer); cache.clear(); };
  return { async search(input) {
    const names = recipeSearchNames(input);
    if (!names.length) return [];
    const key = getKey()?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key) || key === 'your-spoonacular-api-key') throw new RecipeProviderFailure('RECIPE_NOT_CONFIGURED');
    if (key !== configuredKey) { clearCache(); pending.clear(); configuredKey = key; blockedUntil = 0; nextRequest = 0; rejectedKey = false; }
    if (rejectedKey) throw new RecipeProviderFailure('RECIPE_NOT_CONFIGURED');
    const cacheKey = JSON.stringify(names), cached = cache.get(cacheKey);
    if (cached && cached.until > now()) return structuredClone(cached.rows);
    if (cached) { clearTimeout(cached.timer); cache.delete(cacheKey); }
    const waiting = pending.get(cacheKey); if (waiting) return structuredClone(await waiting);
    if (blockedUntil > now()) throw new RecipeProviderFailure('RECIPE_QUOTA_EXHAUSTED');
    if (nextRequest > now()) throw new RecipeProviderFailure('RECIPE_RATE_LIMITED');
    nextRequest = now() + 1100;
    const operation = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); timeout.unref();
      try {
        const url = new URL('https://api.spoonacular.com/recipes/findByIngredients');
        url.search = new URLSearchParams({ ingredients: names.join(','), number: '5', ranking: '1', ignorePantry: 'true' }).toString();
        const response = await transport(url, { headers: { 'x-api-key': key, Accept: 'application/json' },
          signal: controller.signal, redirect: 'error' });
        if (!response.ok) {
          await response.body?.cancel();
          if (response.status === 401 || response.status === 403) { if (configuredKey === key) { rejectedKey = true; clearCache(); } throw new RecipeProviderFailure('RECIPE_NOT_CONFIGURED'); }
          if (response.status === 402) { if (configuredKey === key) { clearCache(); blockedUntil = Math.floor(now() / 86400000) * 86400000 + 86400000; } throw new RecipeProviderFailure('RECIPE_QUOTA_EXHAUSTED'); }
          if (response.status === 429) { if (configuredKey === key) nextRequest = now() + 60000; throw new RecipeProviderFailure('RECIPE_RATE_LIMITED'); }
          throw invalid();
        }
        if (!response.headers.get('content-type')?.toLowerCase().includes('application/json') || Number(response.headers.get('content-length') || 0) > 512000) { await response.body?.cancel(); throw invalid(); }
        const reader = response.body?.getReader(); if (!reader) throw invalid();
        const parts: Uint8Array[] = []; let size = 0;
        while (true) {
          const part = await reader.read(); if (part.done) break;
          size += part.value.byteLength;
          if (size > 512000) { await reader.cancel(); throw invalid(); }
          parts.push(part.value);
        }
        const rows = parseRecipeSummaries(JSON.parse(Buffer.concat(parts).toString('utf8')));
        // Authorization changes during an in-flight response must not repopulate the old cache.
        if (configuredKey === key && !rejectedKey) {
          while (cache.size >= 100) { const oldest = cache.keys().next().value!; clearTimeout(cache.get(oldest)!.timer); cache.delete(oldest); }
          const timer = setTimeout(() => cache.delete(cacheKey), 300000); timer.unref();
          cache.set(cacheKey, { rows, until: now() + 300000, timer });
        }
        return rows;
      } catch (error) {
        if (error instanceof RecipeProviderFailure) throw error;
        throw new RecipeProviderFailure(controller.signal.aborted ? 'RECIPE_TIMEOUT' : 'RECIPE_UNAVAILABLE');
      } finally { clearTimeout(timeout); }
    })();
    pending.set(cacheKey, operation);
    try { return structuredClone(await operation); } finally { if (pending.get(cacheKey) === operation) pending.delete(cacheKey); }
  } };
}
