/** JSON wire contracts shared by mobile and backend; no runtime or database imports. */
export interface ApiSuccess<T> { data: T }
export interface ApiFailure { error: { code: string; message: string; requestId: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export interface ApiIdentity { id: string; email: string; name: string }
export interface HouseholdDto {
  id: string;
  name: string;
  currencyCode: string;
  timezone: string;
  /** UTC ISO timestamps; calendar dates elsewhere use YYYY-MM-DD. */
  createdAt: string;
  updatedAt: string;
  membership: { role: 'MANAGER' };
  preferences: { notificationEnabled: boolean; preferredNotificationTime: string; dateFormat: string } | null;
}
export type HouseholdResponse = ApiSuccess<{ household: HouseholdDto }>;
export type IdentityResponse = ApiSuccess<{ user: ApiIdentity }>;
export interface Pagination { page: number; pageSize: number }
export interface PageInfo extends Pagination { total: number; totalPages: number; hasNextPage: boolean }
export type PaginatedResponse<T> = ApiSuccess<{ items: T[]; pagination: PageInfo }>;
export type PantryStatus = 'ACTIVE' | 'CONSUMED' | 'WASTED' | 'ASSUMED_CONSUMED';
export type CostSource = 'PURCHASE' | 'ESTIMATE' | 'UNKNOWN';
export interface EntryCost { currencyCode: 'INR'; unitCostMinor: number | null; totalCostMinor: number | null; costSource: CostSource }
export type PantryCategory = 'PRODUCE' | 'DAIRY' | 'BAKERY' | 'SNACKS' | 'MEAT' | 'FROZEN' | 'OTHER';
export interface PantryListFilters {
  q?: string; category?: PantryCategory; freshness?: 'critical' | 'caution' | 'fresh'; sort?: 'expiry' | 'name' | 'category';
}
export interface PantryInventoryCounts { active: number; categories: Partial<Record<PantryCategory, number>> }
export type PantryListResponse = ApiSuccess<{ items: PantryItemDto[]; pagination: PageInfo; inventory: PantryInventoryCounts }>;
export interface ExpirySelection {
  packageDate: string | null; userDate: string | null;
  preset: { baseDate: string; days: number } | null;
}
export interface PantryDuplicateConfirmation { confirmed: true; action: 'add_separately' }
export type PantryDuplicateResponse = ApiSuccess<{ matches: PantryItemDto[]; total: number }>;
export interface PantryCreateInput {
  name: string; category: PantryCategory; quantity: string; unit: string;
  expiresOn: string; totalCostMinor: number | null;
  /** Explicit choices; precedence is package > user > estimate. Omitted by legacy clients. */
  expirySelection?: ExpirySelection;
  duplicateConfirmation?: PantryDuplicateConfirmation;
}
export interface PantryItemDto extends PantryCreateInput {
  id: string; currencyCode: 'INR'; status: PantryStatus; source: 'MANUAL' | 'BARCODE' | 'RECEIPT';
  expirySource: 'PACKAGE_DATE' | 'PRESET_ESTIMATE' | 'USER_ENTERED';
  purchaseDate?: string | null; freshnessPresetDays?: number | null;
  daysLeft: number; freshness: 'expired' | 'critical' | 'caution' | 'fresh';
  createdAt: string; updatedAt: string;
}
export type PantryItemResponse = ApiSuccess<{ item: PantryItemDto }>;
export interface PantryEditInput extends Omit<PantryCreateInput, 'duplicateConfirmation'> { expectedUpdatedAt: string }
export interface PantryOutcomeInput { confirmed: true; expectedUpdatedAt: string }
export interface PantryBatchInput {
  confirmed: true;
  items: { id: string; expectedUpdatedAt: string }[];
}
export interface PantryBatchOutcomeInput extends PantryBatchInput { action: 'consume' | 'waste' }
export type PantryBatchResponse = ApiSuccess<{ items: PantryItemDto[] }>;

/** Date-only rescue window: today and tomorrow in the household timezone, not an exact-hour timer. */
export interface ChefExpiringData {
  householdDate: string;
  throughDate: string;
  timezone: string;
  window: 'HOUSEHOLD_TODAY_AND_TOMORROW';
  ingredients: { pantryItemId: string; name: string; quantity: string; unit: string; expiresOn: string }[];
}
export type ChefExpiringResponse = ApiSuccess<ChefExpiringData>;

export interface ChefRecipeSummary {
  id: number; title: string; imageUrl: string | null;
  usedIngredients: { name: string; description: string }[];
  missingIngredients: { name: string; description: string }[];
  provider: 'spoonacular'; providerUrl: string;
  metadata?: ChefRecipeMetadata;
  rescuePriority?: number;
  rescueIngredientCount?: number;
}
export interface ChefSuggestionsData extends ChefExpiringData {
  recipes: (ChefRecipeSummary & { match: ChefIngredientMatch })[];
  state: 'NO_NEAR_EXPIRY' | 'NO_RESULTS' | 'READY';
}
export type ChefSuggestionsResponse = ApiSuccess<ChefSuggestionsData>;

/** Provider recipe values, not Pantry quantities or confirmed inventory outcomes. */
export interface ChefRecipeDetail {
  id: number; title: string; imageUrl: string | null;
  servings: number | null; readyInMinutes: number | null;
  preparationMinutes: number | null; cookingMinutes: number | null;
  ingredients: { providerIngredientId: number | null; name: string; description: string; amount: number | null; unit: string }[];
  instructionGroups: { name: string | null; steps: { number: number; text: string }[] }[];
  instructions: string | null;
  instructionStatus: 'AVAILABLE' | 'UNAVAILABLE';
  source: { name: string | null; url: string | null; credits: string | null; license: string | null };
  provider: 'spoonacular'; providerUrl: string;
}
export type ChefRecipeDetailResponse = ApiSuccess<{ recipe: ChefMatchedRecipeDetail }>;

export interface ChefInventorySnapshot extends ChefExpiringData {
  /** Server-only matching input. Never forward this full list to the recipe provider. */
  pantryIngredients: ChefExpiringData['ingredients'];
}
export interface ChefIngredientMatch {
  basis: 'SUMMARY' | 'FULL_RECIPE';
  pantryNameMatchPercent: number;
  ingredients: {
    name: string; canonicalName: string; description: string;
    status: 'PANTRY' | 'CHECK_STAPLE' | 'NO_MATCH';
    pantryItemIds: string[];
    quantityStatus: 'SUFFICIENT' | 'INSUFFICIENT' | 'CHECK_AMOUNT' | 'NOT_AVAILABLE';
  }[];
  /** Name-only candidates; amounts are never invented or copied as a claimed shortfall. */
  shoppingItems: { name: string; reason: 'NO_MATCH' | 'CHECK_STAPLE' | 'INSUFFICIENT'; checkFirst: boolean }[];
}
export type ChefMatchedRecipeDetail = ChefRecipeDetail & { match: ChefIngredientMatch };

export interface ChefRecipeMetadata {
  id: number; readyInMinutes: number | null;
  vegetarian: boolean | null; vegan: boolean | null;
}
