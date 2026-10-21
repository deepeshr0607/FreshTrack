import type { PantryItemDto } from '../types/api';

export type DashboardFilter = 'priority' | 'overdue' | 'all';
/** Use the complete active snapshot, never the currently filtered Pantry page or demo totals. */
export function dashboardSummary(items: PantryItemDto[]) {
  const active = items.filter(item => item.status === 'ACTIVE');
  const sorted = [...active].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.name.localeCompare(b.name));
  const priced = active.filter(item => item.totalCostMinor !== null);
  return { active: sorted, total: active.length, priced: priced.length,
    valueMinor: priced.reduce((sum, item) => sum + BigInt(item.totalCostMinor!), 0n).toString(),
    overdue: sorted.filter(item => item.daysLeft < 0), priority: sorted.filter(item => item.daysLeft <= 7),
    urgent: active.filter(item => item.daysLeft <= 1).length,
    fresh: active.filter(item => item.daysLeft >= 7).length,
    recent: [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 3) };
}
export function dashboardExpiry(days: number): string {
  return days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}
export function dashboardInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? '').join('').toLocaleUpperCase() || 'FT';
}

/** Read-only and account-bound. Blur/session changes discard late reads; repeated refreshes coalesce. */
export function createDashboardSession(read: () => Promise<PantryItemDto[]>, active: () => boolean) {
  let state: { status: 'idle' | 'loading' | 'ready' | 'error'; items: PantryItemDto[] | null; error: string } = { status: 'idle', items: null, error: '' };
  let generation = 0, work: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate() { generation++; work = null; publish({ status: 'idle', items: null, error: '' }); },
    load() {
      if (!active()) return Promise.resolve();
      if (work) return work;
      const revision = ++generation;
      publish({ status: 'loading', error: '' });
      const task = Promise.resolve().then(() => active() && revision === generation ? read() : null).then(items => {
        if (items && active() && revision === generation) publish({ status: 'ready', items });
      }).catch(() => {
        if (active() && revision === generation) publish({ status: 'error', items: null, error: 'Your kitchen couldn’t refresh. Check your connection and try again.' });
      }).finally(() => { if (work === task) work = null; });
      work = task; return task;
    },
  };
}
