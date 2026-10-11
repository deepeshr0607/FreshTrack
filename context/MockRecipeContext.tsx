import React, { createContext, useContext, useReducer } from 'react';
import { recipeReducer, type RecipeAction, type RecipeState } from '@/lib/recipes';
const Context = createContext<{ state: RecipeState; dispatch: React.Dispatch<RecipeAction> } | null>(null);
export function MockRecipeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(recipeReducer, { shopping: [], saved: [], cooked: [] });
  return <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>;
}
export function useMockRecipes() {
  const value = useContext(Context);
  if (!value) throw new Error('MockRecipeProvider is required.');
  return value;
}
