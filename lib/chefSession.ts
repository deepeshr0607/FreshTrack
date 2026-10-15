import type { ChefExpiringData, ChefSuggestionsData, ChefMatchedRecipeDetail } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';
type Status = 'idle' | 'loading' | 'ready' | 'error';
export interface ChefSnapshot {
  ingredients: ChefExpiringData | null; ingredientsStatus: Status; ingredientsError: string;
  suggestions: ChefSuggestionsData | null; suggestionsStatus: Status; suggestionsError: string;
  recipe: ChefMatchedRecipeDetail | null; detailId: string | null; detailStatus: Status; detailError: string;
  saved: number[]; shopping: { name: string; checked: boolean }[];
}
const empty = (): ChefSnapshot => ({ ingredients: null, ingredientsStatus: 'idle', ingredientsError: '', suggestions: null,
  suggestionsStatus: 'idle', suggestionsError: '', recipe: null, detailId: null, detailStatus: 'idle', detailError: '', saved: [], shopping: [] });
const nameKey = (name: string) => name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
const errorText = (error: unknown) => error instanceof NeonAuthError ? `${error.message} (${error.code})` : 'Recipes are unavailable. Please retry.';
export function createChefSession(api: { ingredients(): Promise<ChefExpiringData>; suggest(): Promise<ChefSuggestionsData>; detail(id: string): Promise<ChefMatchedRecipeDetail> }, active: () => boolean) {
  let state = empty(), generation = 0, detailRequest = 0, disposed = false;
  let expiry: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const publish = (fields: Partial<ChefSnapshot>) => { if (!disposed) { state = { ...state, ...fields }; listeners.forEach(listener => listener()); } };
  const valid = (revision: number) => !disposed && revision === generation && active();
  const invalidate = () => {
    generation++; detailRequest++; if (expiry) clearTimeout(expiry); expiry = null;
    publish({ ...empty(), saved: state.saved, shopping: state.shopping });
  };
  const expireProviderData = () => {
    // Keep the earliest deadline so repeated detail reads cannot extend older search content indefinitely.
    if (expiry) return;
    expiry = setTimeout(invalidate, 300000);
    (expiry as unknown as { unref?: () => void }).unref?.();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    dispose() { invalidate(); disposed = true; listeners.clear(); state = empty(); },
    async loadIngredients() {
      if (!active() || disposed || state.ingredientsStatus === 'loading') return;
      invalidate(); const revision = generation; publish({ ingredientsStatus: 'loading' });
      try { const ingredients = await api.ingredients(); if (valid(revision)) publish({ ingredients, ingredientsStatus: 'ready' }); }
      catch (error) { if (valid(revision)) publish({ ingredientsStatus: 'error', ingredientsError: errorText(error) }); }
    },
    async suggest() {
      if (!active() || disposed || state.suggestionsStatus === 'loading') return;
      invalidate(); const revision = generation; publish({ suggestionsStatus: 'loading' });
      try { const suggestions = await api.suggest(); if (valid(revision)) { publish({ suggestions, suggestionsStatus: 'ready', ingredients: suggestions, ingredientsStatus: 'ready' }); expireProviderData(); } }
      catch (error) { if (valid(revision)) publish({ suggestionsStatus: 'error', suggestionsError: errorText(error) }); }
    },
    async loadDetail(id: string) {
      if (!active() || disposed || state.detailStatus === 'loading' && state.detailId === id) return;
      const revision = generation, request = ++detailRequest;
      publish({ recipe: null, detailId: id, detailStatus: 'loading', detailError: '' });
      try { const recipe = await api.detail(id); if (valid(revision) && request === detailRequest) { publish({ recipe, detailStatus: 'ready' }); expireProviderData(); } }
      catch (error) { if (valid(revision) && request === detailRequest) publish({ detailStatus: 'error', detailError: errorText(error) }); }
    },
    save(id: number) {
      if (!active() || disposed) return;
      if (!state.saved.includes(id) && state.saved.length >= 100) throw new NeonAuthError('CHEF_SAVED_LIMIT', 'Keep up to 100 saved recipe IDs in this session.');
      publish({ saved: state.saved.includes(id) ? state.saved.filter(entry => entry !== id) : [...state.saved, id] });
    },
    addShopping(names: string[]) {
      if (!active() || disposed) return;
      const rows = [...state.shopping];
      for (const name of names) {
        const normalized = nameKey(name);
        if (!normalized || normalized.length > 160) throw new NeonAuthError('CHEF_SHOPPING_INPUT', 'Review the selected ingredient names.');
        if (!rows.some(row => nameKey(row.name) === normalized)) rows.push({ name: normalized, checked: false });
      }
      if (rows.length > 200) throw new NeonAuthError('CHEF_SHOPPING_LIMIT', 'Clear purchased items before adding more than 200 groceries.');
      publish({ shopping: rows });
    },
    toggleShopping(name: string) { if (active() && !disposed) publish({ shopping: state.shopping.map(row => row.name === name ? { ...row, checked: !row.checked } : row) }); },
    clearPurchased() { if (active() && !disposed) publish({ shopping: state.shopping.filter(row => !row.checked) }); },
  };
}
