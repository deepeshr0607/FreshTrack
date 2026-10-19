import type { ReceiptReviewInput, ReceiptImportInput, ReceiptDuplicateRow, ReceiptImportData } from '../types/api';
import type { CacheStorage } from './pantryDiskCache';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { receiptCandidateIssue, receiptReviewSummary, receiptCandidateExpiry } from './receiptCandidates.ts';
import type { LocalReceiptCandidate } from './receiptCandidates';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { manualPantryInput, pantryRetryKey } from './pantryApi.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { resolveExpiry } from './pantryExpiry.ts';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { NeonAuthError } from './neonAuth.ts';

export function reviewedReceiptInput(rows: LocalReceiptCandidate[]): ReceiptReviewInput {
  const plan = receiptReviewSummary(rows);
  if (plan.error) throw new NeonAuthError('RECEIPT_REVIEW', plan.error);
  return cleanReceiptInput({ items: plan.rows.map(row => ({ rowId: row.id, item: { ...manualPantryInput(row.draft), ...(row.expirySelection ? { expirySelection: receiptCandidateExpiry(row).selection } : {}) } })) });
}
/** Strict storage/wire whitelist: source OCR, images and credentials cannot enter saved retries. */
export function cleanReceiptInput(value: unknown): ReceiptReviewInput {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['items', 'confirmed'].includes(key))) throw Error('INVALID_RECEIPT');
  const input = value as ReceiptReviewInput;
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 20) throw Error('INVALID_RECEIPT');
  const items = input.items.map(row => {
    if (!row || Object.keys(row).some(key => !['rowId', 'item'].includes(key)) || typeof row.rowId !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(row.rowId) ||
      !row.item || Object.keys(row.item).some(key => !['name', 'category', 'quantity', 'unit', 'expiresOn', 'totalCostMinor', 'duplicateConfirmation', 'expirySelection'].includes(key))) throw Error('INVALID_RECEIPT');
    const item = row.item;
    if (typeof item.name !== 'string' || typeof item.unit !== 'string' || typeof item.quantity !== 'string' || typeof item.expiresOn !== 'string' ||
      /[\u0000-\u001f\u007f]/.test(item.name + item.unit) || !['PRODUCE', 'DAIRY', 'BAKERY', 'SNACKS', 'MEAT', 'FROZEN', 'OTHER'].includes(item.category) ||
      (item.totalCostMinor !== null && (!Number.isInteger(item.totalCostMinor) || item.totalCostMinor < 0 || item.totalCostMinor > 2147483647))) throw Error('INVALID_RECEIPT');
    const cost = item.totalCostMinor;
    const draft = { name: item.name, unit: item.unit, quantity: item.quantity, expiresOn: item.expiresOn,
      category: (item.category[0]! + item.category.slice(1).toLowerCase()) as LocalReceiptCandidate['draft']['category'],
      price: cost === null ? '' : `${Math.floor(cost / 100)}.${String(cost % 100).padStart(2, '0')}` };
    if (receiptCandidateIssue(draft)) throw Error('INVALID_RECEIPT');
    let expiry;
    if (item.expirySelection !== undefined) {
      expiry = resolveExpiry(item.expirySelection);
      if (expiry.expiresOn !== item.expiresOn) throw Error('INVALID_RECEIPT_EXPIRY');
    }
    const decision = item.duplicateConfirmation;
    if (decision !== undefined && (!decision || Object.keys(decision).some(key => !['confirmed', 'action'].includes(key)) || decision.confirmed !== true || decision.action !== 'add_separately')) throw Error('INVALID_RECEIPT');
    return { rowId: row.rowId, item: { ...manualPantryInput(draft), ...(expiry ? { expirySelection: expiry.selection } : {}), ...(decision ? { duplicateConfirmation: { confirmed: true as const, action: 'add_separately' as const } } : {}) } };
  }).sort((a, b) => a.rowId.localeCompare(b.rowId, 'en'));
  if (new Set(items.map(row => row.rowId)).size !== items.length) throw Error('INVALID_RECEIPT');
  return { items };
}
export interface SavedReceiptImport { version: 1; scope: string; key: string; input: ReceiptImportInput; paused: boolean }
export const receiptImportScope = (branch: string | undefined, subject: string) => JSON.stringify([branch, subject]);
export function receiptImportStorageKey(scope: string) {
  if (!scope || scope.length > 512) throw Error('INVALID_SCOPE');
  return 'freshtrack.receipt.retry.v1.' + Array.from(scope).map(c => c.codePointAt(0)!.toString(16).padStart(6, '0')).join('');
}
/** One immutable intent, chunked below native value-size limits, manifest published last. */
export function createReceiptImportStorage(storage: CacheStorage, scope: string) {
  const prefix = receiptImportStorageKey(scope);
  let queue: Promise<unknown> = Promise.resolve(), revision = 0;
  const run = <T>(fn: () => Promise<T>) => { const result = queue.then(fn); queue = result.catch(() => undefined); return result; };
  const read = async (): Promise<SavedReceiptImport | null> => {
    const raw = await storage.get(prefix); if (raw === null) return null;
    const meta = JSON.parse(raw);
    if (meta.version !== 1 || !Number.isInteger(meta.count) || meta.count < 1 || meta.count > 64 || typeof meta.paused !== 'boolean') throw Error('INVALID_RETRY');
    let rawBody = '';
    for (let index = 0; index < meta.count; index++) {
      const part = await storage.get(`${prefix}.${index}`);
      if (part === null || Array.from(part).length > 400) throw Error('INVALID_RETRY'); rawBody += part;
    }
    const body = JSON.parse(rawBody);
    if (body.version !== 1 || body.scope !== scope || typeof body.key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(body.key) || body.input?.confirmed !== true ||
      Object.keys(body).some(key => !['version', 'scope', 'key', 'input'].includes(key))) throw Error('INVALID_RETRY');
    return { version: 1, scope, key: body.key, input: { ...cleanReceiptInput(body.input), confirmed: true }, paused: meta.paused };
  };
  const wipe = async () => { await storage.remove(prefix); for (let index = 0; index < 64; index++) await storage.remove(`${prefix}.${index}`); };
  return {
    load: () => run(read),
    save(input: ReceiptImportInput, key: string, paused: boolean) {
      const version = revision;
      if (!/^[A-Za-z0-9_-]{16,100}$/.test(key) || input.confirmed !== true) throw Error('INVALID_RETRY');
      const safe = { version: 1, scope, key, input: { ...cleanReceiptInput(input), confirmed: true } };
      const points = Array.from(JSON.stringify(safe)), chunks: string[] = [];
      for (let index = 0; index < points.length; index += 400) chunks.push(points.slice(index, index + 400).join(''));
      if (chunks.length > 64) throw Error('RETRY_TOO_LARGE');
      return run(async () => {
        if (version !== revision) throw Error('SESSION_CHANGED');
        if (await read()) throw Error('RETRY_EXISTS');
        for (const [index, chunk] of chunks.entries()) { if (version !== revision) throw Error('SESSION_CHANGED'); await storage.set(`${prefix}.${index}`, chunk); }
        if (version !== revision) throw Error('SESSION_CHANGED');
        await storage.set(prefix, JSON.stringify({ version: 1, count: chunks.length, paused }));
        if (version !== revision) throw Error('SESSION_CHANGED');
        return { ...safe, version: 1 as const, input: safe.input as ReceiptImportInput, paused };
      });
    },
    resume(key: string) { return run(async () => {
      const pending = await read(); if (!pending || pending.key !== key) throw Error('RETRY_CHANGED');
      const meta = JSON.parse((await storage.get(prefix))!); await storage.set(prefix, JSON.stringify({ ...meta, paused: false }));
      return { ...pending, paused: false };
    }); },
    clear(key?: string) { revision++; return run(async () => { if (key && (await read())?.key !== key) return; await wipe(); }); },
  };
}
export function bindReceiptImportSession(session: {
  getSnapshot(): { checking: boolean; status: string; user: { id: string } | null };
  subscribe(listener: () => void): () => void;
}, clear: (subject: string) => Promise<void>) {
  let previous = session.getSnapshot().user?.id ?? null;
  return session.subscribe(() => {
    const state = session.getSnapshot(); if (state.checking) return;
    const next = state.user?.id ?? null;
    if (previous && (state.status === 'anonymous' || (next && next !== previous))) void clear(previous).catch(() => undefined);
    previous = next;
  });
}
function duplicateRows(value: unknown, input: ReceiptReviewInput): ReceiptDuplicateRow[] {
  const rows = (value as { rows?: ReceiptDuplicateRow[] })?.rows;
  if (!Array.isArray(rows) || rows.length !== input.items.length || new Set(rows.map(row => row.rowId)).size !== rows.length || rows.some(row =>
    !input.items.some(item => item.rowId === row.rowId) || !Number.isSafeInteger(row.total) || row.total < 0 || !Array.isArray(row.matches) || row.matches.length !== Math.min(5, row.total) ||
    !Array.isArray(row.withinHaul) || new Set(row.withinHaul).size !== row.withinHaul.length || row.withinHaul.some(id => id === row.rowId || !input.items.some(item => item.rowId === id)))) throw Error('INVALID_REVIEW_RESPONSE');
  for (const row of rows) {
    if (row.matches.length) cleanReceiptInput({ items: row.matches.map((item, index) => ({ rowId: `match-${index}`, item: { name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, expiresOn: item.expiresOn, totalCostMinor: item.totalCostMinor } })) });
    if (row.matches.some(item => typeof item.id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id) || item.currencyCode !== 'INR')) throw Error('INVALID_REVIEW_RESPONSE');
  }
  return rows;
}
export function receiptImportResult(value: unknown, count: number): ReceiptImportData {
  const result = value as ReceiptImportData;
  const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  if (!result || !uuid.test(result.receiptScanId) || typeof result.replayed !== 'boolean' || !Array.isArray(result.items) || result.items.length !== count ||
    new Set(result.items.map(item => item.id)).size !== count || result.items.some(item => !uuid.test(item.id) || item.source !== 'RECEIPT' || item.currencyCode !== 'INR' ||
      !['ACTIVE', 'CONSUMED', 'WASTED', 'ASSUMED_CONSUMED'].includes(item.status) || !['PACKAGE_DATE', 'USER_ENTERED', 'PRESET_ESTIMATE'].includes(item.expirySource) ||
      !Number.isInteger(item.daysLeft) || !['expired', 'critical', 'caution', 'fresh'].includes(item.freshness) ||
      ![item.createdAt, item.updatedAt].every(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(date) && Number.isFinite(Date.parse(date))))) throw Error('INVALID_IMPORT_RESPONSE');
  cleanReceiptInput({ items: result.items.map((item, index) => ({ rowId: `result-${index}`, item: { name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, expiresOn: item.expiresOn, totalCostMinor: item.totalCostMinor } })) });
  return result;
}
/** Serialized confirmation and frozen retry; never sends automatically on restoration. */
export function createReceiptImportController(io: {
  storage: ReturnType<typeof createReceiptImportStorage>; active(): boolean;
  review(input: ReceiptReviewInput): Promise<{ rows: ReceiptDuplicateRow[] }>;
  send(input: ReceiptImportInput, key: string): Promise<ReceiptImportData>;
}, makeKey = pantryRetryKey) {
  let state = { ready: false, busy: false, stage: 'idle' as 'idle' | 'review' | 'pending' | 'saved',
    input: null as ReceiptReviewInput | null, duplicates: null as ReceiptDuplicateRow[] | null,
    choices: {} as Record<string, 'skip' | 'separate'>, pending: null as SavedReceiptImport | null,
    result: null as ReceiptImportData | null, error: '' };
  const listeners = new Set<() => void>(); let generation = 0, flight = false;
  let settled: Promise<void> = Promise.resolve();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const valid = (version: number) => generation === version && io.active();
  const message = (error: unknown) => error instanceof NeonAuthError ? `${error.message} (${error.code})` : 'Receipt service or saved retry is unavailable. Retry without changing the confirmed haul.';
  const send = async (version: number, pending: SavedReceiptImport) => {
    if (pending.paused) return;
    let response: ReceiptImportData;
    try { response = await io.send(pending.input, pending.key); }
    catch (error) {
      if (valid(version) && error instanceof NeonAuthError && error.code === 'PANTRY_DUPLICATE') {
        // This server error guarantees transaction rollback. Recheck before a new confirmation/key.
        await io.storage.clear(pending.key);
        if (!valid(version)) return;
        const input = cleanReceiptInput({ items: pending.input.items.map(row => ({ ...row, item: { ...row.item, duplicateConfirmation: undefined } })) });
        publish({ pending: null, input, stage: 'review', duplicates: null, choices: {} });
        const checked = await io.review(input);
        if (valid(version)) publish({ duplicates: duplicateRows(checked, input) });
      }
      throw error;
    }
    if (!valid(version)) return;
    const result = receiptImportResult(response, pending.input.items.length);
    await io.storage.clear(pending.key);
    if (valid(version)) publish({ stage: 'saved', result, pending: null, input: null, error: '' });
  };
  const run = async (task: (version: number) => Promise<void>) => {
    if (flight || !io.active()) return;
    flight = true; let finish!: () => void; settled = new Promise(resolve => { finish = resolve; });
    const version = generation; publish({ busy: true, error: '' });
    try { await task(version); } catch (error) { if (valid(version)) publish({ error: message(error) }); }
    finally { flight = false; finish(); if (generation === version) publish({ busy: false }); }
  };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    leave() { generation++; publish({ ready: false, busy: false, input: null, pending: null, duplicates: null, choices: {}, result: null, stage: 'idle', error: '' }); },
    restore: async () => { if (flight) await settled; return run(async version => { const pending = await io.storage.load(); if (valid(version)) publish({ ready: true, pending, stage: pending ? 'pending' : 'idle', input: null, duplicates: null, choices: {}, result: null }); }); },
    review: (value: ReceiptReviewInput) => run(async version => {
      if (!state.ready || state.pending) return;
      const input = cleanReceiptInput(value); publish({ input, duplicates: null, choices: {}, stage: 'review' });
      const response = await io.review(input); if (valid(version)) publish({ duplicates: duplicateRows(response, input) });
    }),
    choose(rowId: string, choice: 'skip' | 'separate') { if (!state.busy && state.stage === 'review' && state.duplicates?.some(row => row.rowId === rowId)) publish({ choices: { ...state.choices, [rowId]: choice }, error: '' }); },
    cancel() { if (!state.busy && !state.pending) publish({ stage: 'idle', input: null, duplicates: null, choices: {}, error: '' }); },
    confirm: (pauseForTest = false) => run(async version => {
      if (state.stage !== 'review' || !state.input || !state.duplicates) return;
      if (state.duplicates.some(row => (row.total || row.withinHaul.length) && !state.choices[row.rowId])) throw new NeonAuthError('RECEIPT_DUPLICATE', 'Choose Skip or Add Separately for every possible duplicate.');
      const items = state.input.items.filter(row => state.choices[row.rowId] !== 'skip').map(row => ({ ...row, item: { ...row.item,
        ...(state.choices[row.rowId] === 'separate' ? { duplicateConfirmation: { confirmed: true as const, action: 'add_separately' as const } } : {}) } }));
      if (!items.length) throw new NeonAuthError('RECEIPT_EMPTY', 'All groceries were skipped. Return to review to choose an item.');
      const input = { ...cleanReceiptInput({ items }), confirmed: true as const };
      let pending: SavedReceiptImport;
      try { pending = await io.storage.save(input, makeKey(), pauseForTest); }
      catch (error) { const recovered = await io.storage.load(); if (valid(version) && recovered) publish({ ready: true, pending: recovered, stage: 'pending' }); throw error; }
      if (!valid(version)) return;
      publish({ pending, stage: 'pending', input: null, duplicates: null, choices: {} });
      await send(version, pending);
    }),
    retry: (endTest = false) => run(async version => {
      let pending = state.pending; if (!pending) return;
      if (endTest && pending.paused) { pending = await io.storage.resume(pending.key); if (!valid(version)) return; publish({ pending }); }
      await send(version, pending);
    }),
    reset() { if (!state.busy && state.stage === 'saved') publish({ stage: 'idle', result: null, error: '' }); },
  };
}
