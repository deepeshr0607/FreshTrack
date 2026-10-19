export const receiptImageDirectory = 'freshtrack-receipts-v1';
const imageName = /^receipt-(input|ready)-[a-z0-9-]{1,80}\.(jpg|jpeg|png|heic|heif|webp|img)$/;
export type ReceiptImageStatus = { files: number | null; inUse: number; failed: boolean };
export class ReceiptImageCacheError extends Error {
  constructor() { super('Temporary receipt photos could not be prepared or cleared. Retry.'); }
}
function fileUri(uri: string) {
  try {
    const url = new URL(uri);
    if (url.protocol !== 'file:' || url.host || url.search || url.hash || url.href !== uri || /%2f|%5c|%00|\\/i.test(uri)) return null;
    return url;
  } catch { return null; }
}
/** Only canonical descendants can be moved/deleted; originals outside app cache are copied. */
export function receiptCacheSource(cacheUri: string, uri: string): boolean {
  const base = fileUri(cacheUri), source = fileUri(uri);
  return !!base && base.pathname !== '/' && !!source && source.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/`);
}
/** Dedicated files only. No directory-wide SDK cache deletion or receipt contents in metadata. */
export function createReceiptImageCache(cacheUri: string, io: {
  list(): string[]; exists(uri: string): boolean; remove(uri: string): void;
  transfer(source: string, target: string, move: boolean): Promise<void>; name(): string;
}) {
  if (!fileUri(cacheUri) || new URL(cacheUri).pathname === '/') throw new ReceiptImageCacheError();
  const root = `${cacheUri.replace(/\/$/, '')}/${receiptImageDirectory}/`;
  const leases = new Map<string, number>();
  const owned = (uri: string) => uri.startsWith(root) && imageName.test(uri.slice(root.length));
  const status = (): ReceiptImageStatus => {
    try {
      const files = io.list().filter(owned);
      return { files: files.length, inUse: files.filter(uri => leases.has(uri)).length, failed: false };
    } catch { return { files: null, inUse: leases.size, failed: true }; }
  };
  const recover = (): ReceiptImageStatus => {
    let failed = false;
    try { for (const uri of io.list()) if (owned(uri) && !leases.has(uri)) {
      try { io.remove(uri); } catch { failed = true; }
    } } catch { failed = true; }
    const current = status();
    return { ...current, failed: failed || current.failed || (current.files !== null && current.files > current.inUse) };
  };
  const prepare = () => { if (recover().failed) throw new ReceiptImageCacheError(); };
  const release = (uri: string) => {
    const count = leases.get(uri);
    if (!owned(uri) || !count) return;
    if (count > 1) { leases.set(uri, count - 1); return; }
    leases.delete(uri);
    try { io.remove(uri); } catch { /* Retained on disk for the next safe recovery sweep. */ }
  };
  return {
    root, status, recover, prepare, release,
    retain(uri: string) {
      const count = leases.get(uri);
      if (!owned(uri) || !count) throw new ReceiptImageCacheError();
      leases.set(uri, count + 1);
    },
    async adopt(source: string, kind: 'input' | 'ready') {
      if (!fileUri(source) || source.startsWith(root)) throw new ReceiptImageCacheError();
      prepare();
      const extension = kind === 'ready' ? 'jpg' : /\.(jpg|jpeg|png|heic|heif|webp)$/i.exec(source)?.[1].toLowerCase() || 'img';
      const name = `receipt-${kind}-${io.name()}.${extension}`, target = root + name;
      if (!imageName.test(name) || leases.has(target) || io.exists(target)) throw new ReceiptImageCacheError();
      // Reserve before async transfer: a foreground sweep cannot remove a partial/live file.
      leases.set(target, 1);
      try { await io.transfer(source, target, receiptCacheSource(cacheUri, source)); return target; }
      catch { release(target); throw new ReceiptImageCacheError(); }
    },
  };
}

/** Confirmed retry/saved fields are independent of the disposable photo and raw OCR state. */
export function bindConfirmedReceiptImageCleanup(importer: {
  getSnapshot(): { stage: string }; subscribe(listener: () => void): () => void;
}, clear: () => void) {
  const changed = () => {
    const stage = importer.getSnapshot().stage;
    if (stage === 'pending' || stage === 'saved') clear();
  };
  changed();
  return importer.subscribe(changed);
}
