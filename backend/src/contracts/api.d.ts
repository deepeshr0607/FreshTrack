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
export interface PantryCreateInput {
  name: string; category: PantryCategory; quantity: string; unit: string;
  expiresOn: string; totalCostMinor: number | null;
}
export interface PantryItemDto extends PantryCreateInput {
  id: string; currencyCode: 'INR'; status: PantryStatus; source: 'MANUAL' | 'BARCODE' | 'RECEIPT';
  expirySource: 'PACKAGE_DATE' | 'PRESET_ESTIMATE' | 'USER_ENTERED';
  daysLeft: number; freshness: 'expired' | 'critical' | 'caution' | 'fresh';
  createdAt: string; updatedAt: string;
}
export type PantryItemResponse = ApiSuccess<{ item: PantryItemDto }>;
