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
