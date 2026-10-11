import type { PantryItem } from './mock';

/** Only confirmed prototype outcomes count; editing an active item does not change totals. */
export function sessionOutcomes(items: PantryItem[]) {
  return items.reduce((total, item) => ({
    saved: total.saved + (item.status === 'CONSUMED' ? item.price : 0),
    wasted: total.wasted + (item.status === 'WASTED' ? item.price : 0),
    usedItems: total.usedItems + (item.status === 'CONSUMED' ? 1 : 0),
    wastedItems: total.wastedItems + (item.status === 'WASTED' ? 1 : 0),
  }), { saved: 0, wasted: 0, usedItems: 0, wastedItems: 0 });
}

export function impactReport(period: string, saved: number, co2: number, rescuedKg: number) {
  return `FreshTrack — ${period} sample impact report\nRescued value: $${saved.toFixed(2)}\nFood rescued: ${rescuedKg.toFixed(1)} kg\nCO2e diverted: ${co2.toFixed(1)} kg\nPrototype data — not a real household audit.`;
}
