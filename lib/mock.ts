/**
 * mock.ts — Centralized mock fixtures for Phase 1.
 *
 * ALL screens must import from here rather than defining their own local data.
 * Replace with real API calls in Phase 4 and beyond.
 *
 * IMPORTANT: No real user data, PII, or secrets belong here.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** Fixed Phase 1 display currency from the supplied designs; no conversion or preference. */
export const MOCK_CURRENCY = { code: 'USD', symbol: '$' } as const;

export type PantryItemStatus = 'ACTIVE' | 'CONSUMED' | 'WASTED' | 'ASSUMED_CONSUMED';
export type ExpirySource = 'PACKAGE_DATE' | 'PRESET_ESTIMATE' | 'USER_ENTERED';
export type ItemCategory = 'Produce' | 'Dairy' | 'Bakery' | 'Snacks' | 'Meat' | 'Frozen' | 'Other';

export interface PantryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  expiresOn: string; // ISO date string YYYY-MM-DD
  daysLeft: number;
  expirySource: ExpirySource;
  price: number; // USD dollars for the whole entry, not per unit; unknown value is 0.
  status: PantryItemStatus;
  imageEmoji: string;
  note?: string;
  source?: 'MANUAL' | 'RECEIPT' | 'BARCODE';
  barcode?: string; // Synthetic catalog identity for Phase 1 barcode duplicate review.
}

export interface Recipe {
  id: string;
  title: string;
  imageEmoji: string;
  prepMinutes: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
  matchPercent: number;
  rescuesItems: string[];
  pantryItems: string[];
  missingIngredients: string[];
  tags: string[];
  instructions: string;
  pantryIds: string[];
  imageKey: 'rigatoni' | 'toast' | 'crumble';
  description: string;
}

export interface WasteEvent {
  month: string; // YYYY-MM
  wastedCost: number; // USD cents; divide by 100 before combining with pantry dollar values.
  savedCost: number; // USD cents.
  wastedItems: number;
  savedItems: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = new Date();
function daysFromNow(n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0]!;
}
function daysAgo(n: number): string {
  return daysFromNow(-n);
}

// ── Pantry Items ──────────────────────────────────────────────────────────────

export const MOCK_PANTRY_ITEMS: PantryItem[] = [
  {
    id: 'p1',
    name: 'Organic Baby Spinach',
    category: 'Produce',
    quantity: 1,
    unit: 'bag',
    expiresOn: daysFromNow(1),
    daysLeft: 1,
    expirySource: 'PRESET_ESTIMATE',
    price: 3.99,
    status: 'ACTIVE',
    imageEmoji: '🥬',
  },
  {
    id: 'p2',
    name: 'Organic Strawberries',
    category: 'Produce',
    quantity: 1,
    unit: 'punnet',
    expiresOn: daysFromNow(0),
    daysLeft: 0,
    expirySource: 'PRESET_ESTIMATE',
    price: 4.29,
    status: 'ACTIVE',
    imageEmoji: '🍓',
  },
  {
    id: 'p3',
    name: 'Horizon Organic Whole Milk',
    category: 'Dairy',
    quantity: 1,
    unit: 'gal',
    expiresOn: daysFromNow(3),
    daysLeft: 3,
    expirySource: 'PACKAGE_DATE',
    price: 4.49,
    status: 'ACTIVE',
    imageEmoji: '🥛',
  },
  {
    id: 'p4',
    name: 'Greek Yogurt Vanilla',
    category: 'Dairy',
    quantity: 1,
    unit: 'tub',
    expiresOn: daysFromNow(6),
    daysLeft: 6,
    expirySource: 'PACKAGE_DATE',
    price: 5.29,
    status: 'ACTIVE',
    imageEmoji: '🍶',
  },
  {
    id: 'p5',
    name: 'Ripe Hass Avocados',
    category: 'Produce',
    quantity: 3,
    unit: 'ct',
    expiresOn: daysFromNow(2),
    daysLeft: 2,
    expirySource: 'PRESET_ESTIMATE',
    price: 4.99,
    status: 'ACTIVE',
    imageEmoji: '🥑',
  },
  {
    id: 'p6',
    name: 'Artisan Sourdough',
    category: 'Bakery',
    quantity: 1,
    unit: 'loaf',
    expiresOn: daysFromNow(3),
    daysLeft: 3,
    expirySource: 'PRESET_ESTIMATE',
    price: 5.20,
    status: 'ACTIVE',
    imageEmoji: '🍞',
  },
  {
    id: 'p7',
    name: 'Pasture-Raised Eggs',
    category: 'Dairy',
    quantity: 12,
    unit: 'ct',
    expiresOn: daysFromNow(12),
    daysLeft: 12,
    expirySource: 'PACKAGE_DATE',
    price: 6.49,
    status: 'ACTIVE',
    imageEmoji: '🥚',
  },
  {
    id: 'p8',
    name: 'Kettle Sea Salt Chips',
    category: 'Snacks',
    quantity: 1,
    unit: 'bag',
    expiresOn: daysFromNow(45),
    daysLeft: 45,
    expirySource: 'PACKAGE_DATE',
    price: 3.99,
    status: 'ACTIVE',
    imageEmoji: '🥔',
  },
];

// Items expiring soon (≤ 48 hours) — used by AI Chef
export const MOCK_EXPIRING_SOON: PantryItem[] = MOCK_PANTRY_ITEMS.filter(
  (item) => item.daysLeft <= 2 && item.status === 'ACTIVE',
);

// ── Recipes ───────────────────────────────────────────────────────────────────

export const MOCK_RECIPES: Recipe[] = [
  {
    id: 'r1',
    pantryIds: ['p1', 'p3'],
    imageKey: 'rigatoni',
    description: 'Silky parmesan-infused ricotta folded over warm rigatoni, using up your urgent spinach and fresh whole milk before spoilage.',
    title: 'Garlic Ricotta & Crispy Spinach Rigatoni',
    imageEmoji: '🍝',
    prepMinutes: 15,
    difficulty: 'Easy',
    calories: 480,
    matchPercent: 95,
    rescuesItems: ['Organic Baby Spinach', 'Horizon Organic Whole Milk'],
    pantryItems: ['Spinach (in fridge)', 'Milk (in fridge)'],
    missingIngredients: ['Rigatoni pasta', 'Ricotta cheese'],
    tags: ['Zero-Waste', 'Quick', 'Vegetarian'],
    instructions:
      'Cook rigatoni al dente. Sauté garlic in olive oil, add spinach until wilted. Fold in ricotta and a splash of milk. Toss with pasta, season generously.',
  },
  {
    id: 'r2',
    pantryIds: ['p1', 'p5'],
    imageKey: 'rigatoni',
    description: 'Use baby spinach and avocado before they lose crispness.',
    title: 'Quick Spinach Stir-Fry',
    imageEmoji: '🥘',
    prepMinutes: 12,
    difficulty: 'Easy',
    calories: 220,
    matchPercent: 90,
    rescuesItems: ['Organic Baby Spinach', 'Ripe Hass Avocados'],
    pantryItems: ['Spinach (in fridge)', 'Avocado (in fridge)'],
    missingIngredients: ['Garlic cloves', 'Soy sauce'],
    tags: ['Zero-Waste', 'Quick', 'Vegan'],
    instructions:
      'Heat oil in wok over high heat. Add garlic, stir 30 seconds. Add spinach and stir-fry 2 minutes. Finish with soy sauce and serve with sliced avocado.',
  },
  {
    id: 'r3',
    pantryIds: ['p6', 'p7'],
    imageKey: 'toast',
    description: 'A quick sourdough breakfast with gently poached eggs.',
    title: 'Poached Egg Sourdough Toast',
    imageEmoji: '🍳',
    prepMinutes: 10,
    difficulty: 'Easy',
    calories: 310,
    matchPercent: 100,
    rescuesItems: ['Artisan Sourdough', 'Pasture-Raised Eggs'],
    pantryItems: ['Sourdough (in pantry)', 'Eggs (in fridge)'],
    missingIngredients: [],
    tags: ['100% Match', 'Quick', 'Breakfast'],
    instructions:
      'Toast sourdough. Poach eggs in simmering water with a splash of vinegar for 3 minutes. Place eggs on toast, season, add toppings of choice.',
  },
  {
    id: 'r4',
    pantryIds: ['p2'],
    imageKey: 'crumble',
    description: 'Turn ripe strawberries into a warm, golden oat crumble.',
    title: 'Warm Mixed Berry & Oat Crumble',
    imageEmoji: '🫐',
    prepMinutes: 25,
    difficulty: 'Easy',
    calories: 380,
    matchPercent: 85,
    rescuesItems: ['Organic Strawberries'],
    pantryItems: ['Strawberries (in fridge)'],
    missingIngredients: ['Rolled oats', 'Brown sugar', 'Butter'],
    tags: ['Comfort Dessert', 'Baked'],
    instructions:
      'Toss strawberries with sugar and cornstarch. Mix oats, flour, brown sugar, and cold butter into crumble. Top berries and bake at 375°F for 25 minutes until golden.',
  },
];

// ── Analytics ─────────────────────────────────────────────────────────────────

export const MOCK_WASTE_EVENTS: WasteEvent[] = [
  { month: '2025-01', wastedCost: 1800, savedCost: 3200, wastedItems: 5, savedItems: 12 },
  { month: '2025-02', wastedCost: 1200, savedCost: 4100, wastedItems: 3, savedItems: 15 },
  { month: '2025-03', wastedCost: 900, savedCost: 4800, wastedItems: 2, savedItems: 18 },
  { month: '2025-04', wastedCost: 600, savedCost: 5200, wastedItems: 2, savedItems: 20 },
  { month: '2025-05', wastedCost: 400, savedCost: 5600, wastedItems: 1, savedItems: 21 },
  { month: '2025-06', wastedCost: 1240, savedCost: 6480, wastedItems: 3, savedItems: 24 },
];

/** Financial chart fixture amounts are USD cents; weekly snapshots are independent of monthly totals. */
export const MOCK_WEEKLY_WASTE = [
  { week: 'W1', amount: 1800 },
  { week: 'W2', amount: 900 },
  { week: 'W3', amount: 400 },
  { week: 'W4', amount: 200 },
];

/** Financial category amounts are USD cents. */
export const MOCK_CATEGORY_BREAKDOWN = [
  { category: 'Dairy Products', amount: 620, percent: 50, color: '#F59E0B' },
  { category: 'Fresh Produce', amount: 380, percent: 31, color: '#059669' },
  { category: 'Bakery & Grains', amount: 240, percent: 19, color: '#E11D48' },
];

/** Hero saved values are USD dollars, matching whole-entry pantry values. */
export const MOCK_HERO_RESCUES = [
  {
    id: 'h1',
    name: 'Baby Spinach (200g)',
    saved: 3.99,
    imageEmoji: '🥬',
    note: 'Stirred into garlic pesto pasta before expiry',
  },
  {
    id: 'h2',
    name: 'Whole Milk (0.5 Gal)',
    saved: 4.29,
    imageEmoji: '🥛',
    note: 'Baked into weekend buttermilk pancakes',
  },
  {
    id: 'h3',
    name: 'Spotty Bananas (4x)',
    saved: 2.15,
    imageEmoji: '🍌',
    note: 'Turned into cinnamon banana bread slices',
  },
];

// ── Analytics Summary ─────────────────────────────────────────────────────────

/** Monetary summary fields are USD dollars; nested chart/category fixtures retain cents. */
export const MOCK_ANALYTICS_SUMMARY = {
  month: 'June 2025',
  wastePrevScore: 88,
  moneySaved: 64.80,
  foodWasted: 12.40,
  foodWastedPrevious: 38.00,
  co2Prevented: 18.6,
  milesEquivalent: 46,
  weeklyWaste: MOCK_WEEKLY_WASTE,
  categoryBreakdown: MOCK_CATEGORY_BREAKDOWN,
  heroRescues: MOCK_HERO_RESCUES,
};

export type InsightPeriod = 'This Month' | 'Weekly' | 'All Time';
export interface InsightSummary {
  /** saved is USD dollars; mass/carbon fields are illustrative kilograms. */
  saved: number; meals: number; rescuedKg: number; co2Kg: number; wasteKg: number;
  wasteFree: number; rescues: number; goal: number; growth: string;
}
/** June design snapshots. Weekly and All Time are explicit prototype comparison samples. */
export const MOCK_INSIGHT_PERIODS: Record<InsightPeriod, InsightSummary> = {
  'This Month': { saved: 84.50, meals: 14, rescuedKg: 19.2, co2Kg: 42.8, wasteKg: 1.6, wasteFree: 92, rescues: 17, goal: 20, growth: '+18% vs May' },
  Weekly: { saved: 24.50, meals: 4, rescuedKg: 5.8, co2Kg: 12.9, wasteKg: 0.1, wasteFree: 98, rescues: 5, goal: 7, growth: '+8% vs last week' },
  'All Time': { saved: 323.80, meals: 54, rescuedKg: 75.6, co2Kg: 168.5, wasteKg: 8.4, wasteFree: 90, rescues: 110, goal: 120, growth: 'Six-month overview' },
};
export const MOCK_EFFICIENCY: { label: string; rescued: number; wasted: number }[] = [
  { label: 'W1', rescued: 3.8, wasted: 0.7 }, { label: 'W2', rescued: 4.5, wasted: 0.5 },
  { label: 'W3', rescued: 5.1, wasted: 0.3 }, { label: 'W4', rescued: 5.8, wasted: 0.1 },
];
/** Sustainability category values are USD dollars. */
export const MOCK_SAVED_CATEGORIES: { name: string; kg: number; value: number; rate: number; icon: string }[] = [
  { name: 'Produce & Greens', kg: 8.4, value: 38.20, rate: 96, icon: 'leaf' },
  { name: 'Dairy & Plant Milk', kg: 5.1, value: 24.80, rate: 91, icon: 'cup-outline' },
  { name: 'Bakery & Bread', kg: 3.2, value: 12.50, rate: 88, icon: 'bread-slice-outline' },
  { name: 'Proteins & Deli', kg: 2.5, value: 9.00, rate: 100, icon: 'food-steak' },
];
export const MOCK_HABIT_RECOMMENDATION = 'Dairy items typically expire 2 days before your Sunday grocery restock. Consider buying pints instead of half-gallons or preparing berry yogurt parfaits on Thursday mornings!';
export const MOCK_KITCHEN_BADGES = ['14-Day Streak', 'Greens Guardian', 'Receipt Rescuer'];

export const MOCK_PREFERENCES: { digest: boolean; hour: string } = { digest: true, hour: '17:00' };
