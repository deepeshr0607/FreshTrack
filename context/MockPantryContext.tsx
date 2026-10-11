import React, { createContext, useContext, useReducer, useRef } from 'react';
import { MOCK_PANTRY_ITEMS, type PantryItem } from '@/lib/mock';
import { prepareBarcodeImport, type BarcodeCandidate } from '@/lib/barcode';
import { prepareReceiptImport, type ReceiptCandidate } from '@/lib/receipt';
import { pantryReducer, validatePantryDraft, type PantryAction, type PantryDraft } from '@/lib/pantry';

const MockPantryContext = createContext<{
  items: PantryItem[];
  dispatch: React.Dispatch<PantryAction>;
  addBarcodeQueue: (queue: BarcodeCandidate[]) => { ids: string[]; error: string | null };
  addReceipt: (candidates: ReceiptCandidate[]) => { ids: string[]; error: string | null };
  addItem: (draft: PantryDraft) => { id: string; error: null } | { id: null; error: string };
} | null>(null);

/** Shared demo inventory survives navigation; restarting the app resets fixtures. */
export function MockPantryProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(pantryReducer, MOCK_PANTRY_ITEMS);
  const nextId = useRef(0);
  const addItem = (draft: PantryDraft) => {
    const error = validatePantryDraft(draft);
    if (error) return { id: null, error };
    let id: string;
    do { id = `manual-${++nextId.current}`; } while (items.some((item) => item.id === id));
    dispatch({ type: 'add', id, draft });
    return { id, error: null };
  };
  const addReceipt = (candidates: ReceiptCandidate[]) => {
    const result = prepareReceiptImport(candidates, items, `receipt-${++nextId.current}`);
    if (result.error) return { ids: [], error: result.error };
    dispatch({ type: 'receipt', items: result.items! });
    return { ids: result.items!.map((item) => item.id), error: null };
  };
  const addBarcodeQueue = (queue: BarcodeCandidate[]) => {
    const result = prepareBarcodeImport(queue, items, `barcode-${++nextId.current}`);
    if (!result.items) return { ids: [], error: result.error };
    dispatch({ type: 'barcode', items: result.items });
    return { ids: result.items.map((item) => item.id), error: null };
  };
  return <MockPantryContext.Provider value={{ items, dispatch, addItem, addReceipt, addBarcodeQueue }}>{children}</MockPantryContext.Provider>;
}

export function useMockPantry() {
  const value = useContext(MockPantryContext);
  if (!value) throw new Error('MockPantryProvider is required.');
  return value;
}
