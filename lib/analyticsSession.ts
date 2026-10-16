import type { AnalyticsSeries } from '../types/api';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';
export function createAnalyticsSession(api: { series(month?: string): Promise<AnalyticsSeries> }, active: () => boolean) {
  let state: { month: string | undefined; data: AnalyticsSeries | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string } = { month: undefined, data: null, status: 'idle', error: '' };
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const invalidate = () => { generation++; publish({ data: null, status: 'idle', error: '' }); };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    invalidate,
    async load(month = state.month) {
      if (!active() || state.status === 'loading' && state.month === month) return;
      const revision = ++generation; publish({ month, data: null, status: 'loading', error: '' });
      try { const data = await api.series(month); if (active() && revision === generation) publish({ data, status: 'ready' }); }
      catch (error) { if (active() && revision === generation) publish({ status: 'error', error: error instanceof NeonAuthError ? `${error.message} (${error.code})` : 'Analytics are unavailable. Please retry.' }); }
    },
    current() { invalidate(); publish({ month: undefined }); },
  };
}
