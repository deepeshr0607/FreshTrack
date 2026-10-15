import type { ChefRecipeDetail, ChefRecipeSummary, ChefRecipeMetadata } from '../contracts/api';

export class RecipeProviderFailure extends Error {
  constructor(readonly code: 'RECIPE_NOT_CONFIGURED' | 'RECIPE_QUOTA_EXHAUSTED' | 'RECIPE_RATE_LIMITED' | 'RECIPE_TIMEOUT' | 'RECIPE_UNAVAILABLE' | 'RECIPE_INGREDIENT_LIMIT' | 'RECIPE_NOT_AVAILABLE') { super(code); }
}
export interface RecipeProvider { search(names: string[]): Promise<ChefRecipeSummary[]>; detail(id: number): Promise<ChefRecipeDetail>; metadata(ids: number[]): Promise<ChefRecipeMetadata[]> }
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
function recipePresentation(imageValue: unknown, title: string, id: number) {
  let imageUrl: string | null = null;
  if (imageValue) {
    const image = new URL(text(imageValue, 1024));
    if (image.protocol !== 'https:' || !['img.spoonacular.com', 'images.spoonacular.com'].includes(image.hostname) || image.username || image.password || image.port) throw invalid();
    imageUrl = image.href;
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
  return { imageUrl, providerUrl: `https://spoonacular.com/recipes/${slug}-${id}` };
}
export function parseRecipeSummaries(value: unknown): ChefRecipeSummary[] {
  if (!Array.isArray(value) || value.length > 5) throw invalid();
  const ids = new Set<number>();
  return value.map(row => {
    if (!row || !Number.isSafeInteger(row.id) || row.id < 1 || ids.has(row.id)) throw invalid();
    ids.add(row.id);
    const title = text(row.title, 240), used = ingredients(row.usedIngredients), missing = ingredients(row.missedIngredients);
    if (row.usedIngredientCount !== used.length || row.missedIngredientCount !== missing.length) throw invalid();
    const presentation = recipePresentation(row.image, title, row.id);
    return { id: row.id, title, ...presentation, usedIngredients: used, missingIngredients: missing,
      provider: 'spoonacular' as const };
  }).filter(row => row.usedIngredients.length > 0)
    .sort((a, b) => b.usedIngredients.length - a.usedIngredients.length || a.missingIngredients.length - b.missingIngredients.length || a.id - b.id);
}
/** Convert provider markup to display-only text. Never return HTML to a mobile renderer. */
function displayText(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maximum) throw invalid();
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const decode = (input: string) => input.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, entity: string) => {
    if (entity.startsWith('#')) {
      const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    }
    return entities[entity.toLowerCase()] ?? whole;
  });
  const cleaned = decode(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(?:p|li|div|ol|ul)\s*>/gi, '\n').replace(/<[^>]*>/g, '')
    .normalize('NFC').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(cleaned)) throw invalid();
  return cleaned || null;
}
function nullableNumber(value: unknown, maximum: number, minimum = 0): number | null {
  // Provider uses -1 for unknown preparation/cooking times.
  if (value === undefined || value === null || value === -1) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw invalid();
  return value;
}
function sourceUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  const url = new URL(text(value, 2048));
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !url.hostname.includes('.')) throw invalid();
  return url.href;
}
export function validRecipeId(id: number) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new RecipeProviderFailure('RECIPE_NOT_AVAILABLE');
  return id;
}
export function parseRecipeDetail(value: unknown, expectedId: number): ChefRecipeDetail {
  validRecipeId(expectedId);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const row = value as Record<string, unknown>;
  if (row['id'] !== expectedId) throw invalid();
  const title = text(row['title'], 240);
  const presentation = recipePresentation(row['image'], title, expectedId);
  const items = row['extendedIngredients'];
  if (!Array.isArray(items) || items.length > 100) throw invalid();
  const recipeIngredients = items.map(item => {
    if (!item || typeof item !== 'object') throw invalid();
    const id = item.id === undefined || item.id === null ? null : item.id;
    if (id !== null && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647)) throw invalid();
    return { providerIngredientId: id, name: text(item.name, 160), description: displayText(item.original, 1000) ?? text(item.name, 160),
      amount: nullableNumber(item.amount, 1000000), unit: item.unit === '' || item.unit === undefined || item.unit === null ? '' : text(item.unit, 100) };
  });
  const analyzed = row['analyzedInstructions'] ?? [];
  if (!Array.isArray(analyzed) || analyzed.length > 20) throw invalid();
  let totalSteps = 0;
  const instructionGroups = analyzed.map(group => {
    if (!group || typeof group !== 'object' || !Array.isArray(group.steps) || (totalSteps += group.steps.length) > 200) throw invalid();
    let prior = 0;
    const steps = group.steps.map((step: { number?: unknown; step?: unknown }) => {
      if (!step || !Number.isSafeInteger(step.number) || Number(step.number) <= prior) throw invalid();
      prior = Number(step.number);
      const instruction = displayText(step.step, 10000); if (!instruction) throw invalid();
      return { number: prior, text: instruction };
    });
    return { name: displayText(group.name, 300), steps };
  }).filter(group => group.steps.length);
  const instructions = displayText(row['instructions'], 60000);
  return { id: expectedId, title, imageUrl: presentation.imageUrl,
    servings: nullableNumber(row['servings'], 10000, 0.01), readyInMinutes: nullableNumber(row['readyInMinutes'], 100000),
    preparationMinutes: nullableNumber(row['preparationMinutes'], 100000), cookingMinutes: nullableNumber(row['cookingMinutes'], 100000),
    ingredients: recipeIngredients, instructionGroups, instructions,
    instructionStatus: instructionGroups.length || instructions ? 'AVAILABLE' : 'UNAVAILABLE',
    source: { name: displayText(row['sourceName'], 500), url: sourceUrl(row['sourceUrl']), credits: displayText(row['creditsText'], 1000),
      license: displayText(row['license'], 300) }, provider: 'spoonacular', providerUrl: presentation.providerUrl };
}
export function parseRecipeMetadata(value: unknown, ids: number[]): ChefRecipeMetadata[] {
  if (!Array.isArray(value) || value.length !== ids.length) throw invalid();
  const found = new Set<number>();
  const rows = value.map(row => {
    if (!row || !ids.includes(row.id) || found.has(row.id)) throw invalid();
    found.add(row.id);
    const ready = nullableNumber(row.readyInMinutes, 100000);
    const flag = (value: unknown) => { if (value === undefined || value === null) return null;
      if (typeof value !== 'boolean') throw invalid(); return value; };
    return { id: row.id as number, readyInMinutes: ready === 0 ? null : ready, vegetarian: flag(row.vegetarian), vegan: flag(row.vegan) };
  });
  return rows.sort((a, b) => a.id - b.id);
}
/** Bounded process-local caching/rate protection; serverless instances do not share this state. */
export function createSpoonacularProvider(options: { key?: () => string | undefined; fetch?: typeof fetch; now?: () => number } = {}): RecipeProvider {
  const getKey = options.key ?? (() => process.env['SPOONACULAR_API_KEY']);
  const transport = options.fetch ?? fetch, now = options.now ?? Date.now;
  const cache = new Map<string, { rows: unknown; timer: ReturnType<typeof setTimeout>; until: number }>();
  const pending = new Map<string, Promise<unknown>>();
  let configuredKey = '', blockedUntil = 0, nextRequest = 0, rejectedKey = false;
  const clearCache = () => { for (const entry of cache.values()) clearTimeout(entry.timer); cache.clear(); };
  const request = async <T>(cacheKey: string, path: string, parameters: Record<string, string>, parse: (value: unknown) => T, notFound = false): Promise<T> => {
    const key = getKey()?.trim() || '';
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(key) || key === 'your-spoonacular-api-key') throw new RecipeProviderFailure('RECIPE_NOT_CONFIGURED');
    if (key !== configuredKey) { clearCache(); pending.clear(); configuredKey = key; blockedUntil = 0; nextRequest = 0; rejectedKey = false; }
    if (rejectedKey) throw new RecipeProviderFailure('RECIPE_NOT_CONFIGURED');
    const cached = cache.get(cacheKey);
    if (cached && cached.until > now()) return structuredClone(cached.rows) as T;
    if (cached) { clearTimeout(cached.timer); cache.delete(cacheKey); }
    const waiting = pending.get(cacheKey); if (waiting) return structuredClone(await waiting) as T;
    if (blockedUntil > now()) throw new RecipeProviderFailure('RECIPE_QUOTA_EXHAUSTED');
    if (nextRequest > now()) throw new RecipeProviderFailure('RECIPE_RATE_LIMITED');
    nextRequest = now() + 1100;
    const operation = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); timeout.unref();
      try {
        const url = new URL(path, 'https://api.spoonacular.com');
        url.search = new URLSearchParams(parameters).toString();
        const response = await transport(url, { headers: { 'x-api-key': key, Accept: 'application/json' },
          signal: controller.signal, redirect: 'error' });
        if (!response.ok) {
          await response.body?.cancel();
          if (notFound && response.status === 404) throw new RecipeProviderFailure('RECIPE_NOT_AVAILABLE');
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
        const rows = parse(JSON.parse(Buffer.concat(parts).toString('utf8')));
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
  };
  return {
    async search(input) {
      const names = recipeSearchNames(input); if (!names.length) return [];
      return request(`search:${JSON.stringify(names)}`, '/recipes/findByIngredients',
        { ingredients: names.join(','), number: '5', ranking: '1', ignorePantry: 'true' }, parseRecipeSummaries);
    },
    async metadata(input) {
      const ids = [...input].sort((a, b) => a - b);
      if (!ids.length) return [];
      if (ids.length > 5 || new Set(ids).size !== ids.length) throw new RecipeProviderFailure('RECIPE_NOT_AVAILABLE');
      ids.forEach(validRecipeId);
      return request(`metadata:${ids.join(',')}`, '/recipes/informationBulk',
        { ids: ids.join(','), includeNutrition: 'false' }, value => parseRecipeMetadata(value, ids));
    },
    async detail(id) {
      validRecipeId(id);
      return request(`detail:${id}`, `/recipes/${id}/information`,
        { includeNutrition: 'false', addWinePairing: 'false', addTasteData: 'false' }, value => parseRecipeDetail(value, id), true);
    },
  };
}
