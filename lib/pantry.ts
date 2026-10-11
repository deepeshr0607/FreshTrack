import type { ItemCategory, PantryItem } from './mock';

export const PANTRY_CATEGORIES: { name: ItemCategory; emoji: string }[] = [
  { name: 'Produce', emoji: '🥬' }, { name: 'Dairy', emoji: '🥛' },
  { name: 'Bakery', emoji: '🍞' }, { name: 'Snacks', emoji: '🥨' },
  { name: 'Meat', emoji: '🥩' }, { name: 'Frozen', emoji: '🧊' },
  { name: 'Other', emoji: '🛒' },
];

export interface PantryEdit {
  name: string;
  quantity: string;
  unit: string;
  expiresOn: string;
}

export interface PantryDraft extends PantryEdit {
  category: ItemCategory;
  price: string;
}

const decimal = /^\d+(?:[.,]\d+)?$/;
const numeric = (value: string) => value.trim().replace(',', '.');

export function validatePantryDraft(draft: PantryDraft): string | null {
  if (!decimal.test(draft.quantity.trim())) return 'Quantity must be a number greater than zero.';
  const error = validatePantryEdit({ ...draft, quantity: numeric(draft.quantity) });
  if (error) return error;
  if (!PANTRY_CATEGORIES.some((category) => category.name === draft.category)) return 'Choose a valid category.';
  if (draft.price.trim() && (!decimal.test(draft.price.trim()) || !Number.isFinite(Number(numeric(draft.price))))) {
    return 'Purchase value must be zero or a positive number.';
  }
  return null;
}

/** Manual entry always records a user-entered date, including an already-expired date. */
export function createPantryItem(id: string, draft: PantryDraft): PantryItem | null {
  if (!id.trim() || validatePantryDraft(draft)) return null;
  return { id, name: draft.name.trim(), quantity: Number(numeric(draft.quantity)), unit: draft.unit.trim(),
    expiresOn: draft.expiresOn, daysLeft: expiryDays(draft.expiresOn), expirySource: 'USER_ENTERED',
    category: draft.category, price: draft.price.trim() ? Number(numeric(draft.price)) : 0,
    status: 'ACTIVE', source: 'MANUAL', imageEmoji: PANTRY_CATEGORIES.find((category) => category.name === draft.category)!.emoji,
    ...(draft.price.trim() ? {} : { note: 'Purchase value unknown; counted as $0 in this prototype.' }) };
}

/** Compare calendar dates without UTC conversions shifting a local expiry day. */
export function expiryDays(expiresOn: string, today = new Date()): number {
  const [year, month, day] = expiresOn.split('-').map(Number);
  return Math.round((Date.UTC(year!, month! - 1, day!) -
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function validatePantryEdit(edit: PantryEdit): string | null {
  if (!edit.name.trim()) return 'Enter an item name.';
  if (!edit.unit.trim()) return 'Enter a unit, such as bag or kg.';
  if (!Number.isFinite(Number(edit.quantity)) || Number(edit.quantity) <= 0) {
    return 'Quantity must be a number greater than zero.';
  }
  const date = new Date(`${edit.expiresOn}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edit.expiresOn) ||
      !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== edit.expiresOn) {
    return 'Enter a valid expiry date in YYYY-MM-DD format.';
  }
  return null;
}

export type PantryAction =
  | { type: 'add'; id: string; draft: PantryDraft }
  | { type: 'edit'; id: string; edit: PantryEdit }
  | { type: 'status'; id: string; status: 'CONSUMED' | 'WASTED' };

/** In-memory Phase 1 actions; resolved items cannot be edited or resolved twice. */
export function pantryReducer(items: PantryItem[], action: PantryAction): PantryItem[] {
  if (action.type === 'add') {
    if (items.some((item) => item.id === action.id)) return items;
    const item = createPantryItem(action.id, action.draft);
    return item ? [item, ...items] : items;
  }
  if (action.type === 'edit' && validatePantryEdit(action.edit)) return items;
  return items.map((item) => {
    if (item.id !== action.id || item.status !== 'ACTIVE') return item;
    if (action.type === 'status') return { ...item, status: action.status };
    return {
      ...item,
      name: action.edit.name.trim(),
      quantity: Number(action.edit.quantity),
      unit: action.edit.unit.trim(),
      expiresOn: action.edit.expiresOn,
      daysLeft: expiryDays(action.edit.expiresOn),
      expirySource: action.edit.expiresOn === item.expiresOn ? item.expirySource : 'USER_ENTERED',
    };
  });
}
