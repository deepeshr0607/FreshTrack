export type OcrPhotoSource = 'camera' | 'library';
type OcrErrorCode = 'PERMISSION' | 'IMAGE' | 'UNAVAILABLE' | 'READ';
export class ReceiptOcrError extends Error {
  readonly code: OcrErrorCode;
  constructor(code: OcrErrorCode) {
    super({ PERMISSION: 'Photo access was not granted. Retry or open device settings.',
      IMAGE: 'Choose a smaller, clear still image and try again.', UNAVAILABLE: 'On-device OCR requires an updated FreshTrack development build.',
      READ: 'The image could not be read. Retry or take a clearer photo.' }[code]);
    this.code = code;
  }
}
export function ocrLines(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 500 || value.some(v => typeof v !== 'string' || v.length > 10000)) throw new ReceiptOcrError('READ');
  const lines = value.flatMap(v => (v as string).split(/\r?\n/)).map(v => v.trim()).filter(Boolean);
  if (lines.length > 500 || lines.join('\n').length > 50000) throw new ReceiptOcrError('READ');
  return lines;
}
export function createReceiptOcrProbe(deps: {
  choose(source: OcrPhotoSource): Promise<string | null>;
  recognize(uri: string): Promise<unknown>;
  dispose(uri: string): void;
}, active: () => boolean) {
  let state = { image: null as string | null, lines: [] as string[], busy: false, read: false, error: '' };
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const clear = () => { generation++; if (state.image) deps.dispose(state.image); publish({ image: null, lines: [], busy: false, read: false, error: '' }); };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    clear,
    async choose(source: OcrPhotoSource) {
      if (!active() || state.busy) return;
      const revision = ++generation; publish({ busy: true, error: '' });
      try {
        const image = await deps.choose(source);
        if (revision !== generation || !active()) { if (image) deps.dispose(image); return; }
        if (image) { if (state.image) deps.dispose(state.image); publish({ image, lines: [], read: false }); }
      } catch (error) { if (revision === generation && active()) publish({ error: error instanceof ReceiptOcrError ? error.message : new ReceiptOcrError('IMAGE').message }); }
      finally { if (revision === generation) publish({ busy: false }); }
    },
    async read() {
      if (!active() || state.busy || !state.image) return;
      const revision = ++generation, image = state.image; publish({ busy: true, error: '', lines: [], read: false });
      try {
        const lines = ocrLines(await deps.recognize(image));
        if (revision === generation && active()) publish({ lines, read: true });
      } catch (error) { if (revision === generation && active()) publish({ error: error instanceof ReceiptOcrError ? error.message : new ReceiptOcrError('READ').message }); }
      finally { if (revision === generation) publish({ busy: false }); }
    },
  };
}
