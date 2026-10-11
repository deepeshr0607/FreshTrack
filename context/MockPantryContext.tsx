import React, { createContext, useContext, useReducer, useRef } from 'react';
import { MOCK_PANTRY_ITEMS, type PantryItem } from '@/lib/mock';
import { pantryReducer, validatePantryDraft, type PantryAction, type PantryDraft } from '@/lib/pantry';

const MockPantryContext = createContext<{
  items: PantryItem[];
  dispatch: React.Dispatch<PantryAction>;
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
  return <MockPantryContext.Provider value={{ items, dispatch, addItem }}>{children}</MockPantryContext.Provider>;
}

export function useMockPantry() {
  const value = useContext(MockPantryContext);
  if (!value) throw new Error('MockPantryProvider is required.');
  return value;
}
