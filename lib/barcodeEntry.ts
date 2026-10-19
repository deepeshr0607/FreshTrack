import type { BarcodeLookup, PantryCreateInput } from '../types/api';
import type { CacheStorage } from './pantryDiskCache';
// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { packageBarcode } from './packageBarcode.ts';
// @ts-expect-error Reuse the reviewed-grocery whitelist without storing any receipt data.
import { cleanReceiptInput } from './receiptImport.ts';

export function cleanBarcodeInput(value: unknown): PantryCreateInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('INVALID_BARCODE_ENTRY');
  const { barcode, ...fields } = value as PantryCreateInput;
  if (typeof barcode !== 'string' || !packageBarcode(barcode) || barcode !== barcode.trim()) throw Error('INVALID_BARCODE_ENTRY');
  return { ...cleanReceiptInput({ items: [{ rowId: 'barcode', item: fields }] }).items[0]!.item, barcode: barcode.padStart(14, '0') };
}
export interface BarcodeIntent { key: string; input: PantryCreateInput }
/** One account/branch-scoped immutable save; bounded chunks, manifest published last. */
export function createBarcodeRetryStorage(io: CacheStorage, scope: string) {
  if (!scope || scope.length > 512) throw Error('INVALID_SCOPE');
  const prefix = 'freshtrack.barcode.retry.v1.' + Array.from(scope).map(c => c.codePointAt(0)!.toString(16).padStart(6, '0')).join('');
  let queue: Promise<unknown> = Promise.resolve(), revision = 0;
  const run = <T>(fn: () => Promise<T>) => { const result = queue.then(fn); queue = result.catch(() => undefined); return result; };
  const read = async (): Promise<BarcodeIntent | null> => {
    const raw = await io.get(prefix); if (raw === null) return null;
    const meta = JSON.parse(raw);
    if (meta.version !== 1 || !Number.isInteger(meta.count) || meta.count < 1 || meta.count > 8) throw Error('INVALID_RETRY');
    let body = '';
    for (let i = 0; i < meta.count; i++) { const part = await io.get(`${prefix}.${i}`); if (part === null || Array.from(part).length > 300) throw Error('INVALID_RETRY'); body += part; }
    const row = JSON.parse(body);
    if (row.scope !== scope || typeof row.key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(row.key) || Object.keys(row).some(k => !['scope', 'key', 'input'].includes(k))) throw Error('INVALID_RETRY');
    return { key: row.key, input: cleanBarcodeInput(row.input) };
  };
  const wipe = async () => { await io.remove(prefix); for (let i = 0; i < 8; i++) await io.remove(`${prefix}.${i}`); };
  return {
    load: () => run(read),
    save(input: PantryCreateInput, key: string) {
      if (!/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw Error('INVALID_RETRY');
      const row = { scope, key, input: cleanBarcodeInput(input) }, chunks: string[] = [], points = Array.from(JSON.stringify(row)), version = revision;
      for (let i = 0; i < points.length; i += 300) chunks.push(points.slice(i, i + 300).join(''));
      if (chunks.length > 8) throw Error('RETRY_TOO_LARGE');
      return run(async () => {
        if (version !== revision) throw Error('SESSION_CHANGED');
        if (await read()) throw Error('RETRY_EXISTS');
        for (const [i, chunk] of chunks.entries()) { if (version !== revision) throw Error('SESSION_CHANGED'); await io.set(`${prefix}.${i}`, chunk); }
        if (version !== revision) throw Error('SESSION_CHANGED');
        await io.set(prefix, JSON.stringify({ version: 1, count: chunks.length }));
        if (version !== revision) throw Error('SESSION_CHANGED');
        return { key, input: row.input };
      });
    },
    clear(key?: string) {
      if (!key) revision++; // Session cleanup invalidates pending writes immediately.
      return run(async () => { if (key && (await read())?.key !== key) return; await wipe(); });
    },
  };
}
