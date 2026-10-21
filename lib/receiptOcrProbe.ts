// @ts-expect-error Explicit extensions support Node strip-types tests and Metro.
import { receiptTextBoxes } from './receiptTextBoxes.ts';
import type { ReceiptTextBox } from './receiptTextBoxes';
export type OcrPhotoSource = 'camera' | 'library';
export type OcrErrorCode = 'PERMISSION' | 'IMAGE' | 'UNAVAILABLE' | 'READ' | 'CLEANUP';
export class ReceiptOcrError extends Error {
  readonly code: OcrErrorCode;
  constructor(code: OcrErrorCode) {
    super({ PERMISSION: 'Photo access was not granted. Retry or open device settings.',
      CLEANUP: 'Temporary receipt photos could not be prepared or cleared. Retry or use manual entry.',
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
/** Older native builds/Android keep string-only recognition; unusable geometry never loses text. */
export function ocrRecognition(value: unknown): { lines: string[]; layout: ReceiptTextBox[] | null } {
  if (Array.isArray(value)) return { lines: ocrLines(value), layout: null };
  if (!value || typeof value !== 'object' || !('lines' in value)) throw new ReceiptOcrError('READ');
  const packet = value as { lines: unknown; boxes?: unknown };
  const lines = ocrLines(packet.lines);
  try {
    const layout = receiptTextBoxes(packet.boxes);
    if (layout.length !== lines.length || layout.some((line, i) => line.text !== lines[i])) return { lines, layout: null };
    return { lines, layout };
  } catch { return { lines, layout: null }; }
}
export function createReceiptOcrProbe(deps: {
  choose(source: OcrPhotoSource): Promise<string | null>;
  recognize(uri: string): Promise<unknown>;
  dispose(uri: string): void;
}, active: () => boolean) {
  let state = { image: null as string | null, lines: [] as string[], layout: null as ReceiptTextBox[] | null, busy: false, read: false, error: '', errorCode: null as OcrErrorCode | null };
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const clear = () => { generation++; if (state.image) deps.dispose(state.image); publish({ image: null, lines: [], layout: null, busy: false, read: false, error: '', errorCode: null }); };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    clear,
    async choose(source: OcrPhotoSource, autoRead = false) {
      if (!active() || state.busy) return;
      let reading = false;
      const revision = ++generation; publish({ busy: true, error: '', errorCode: null });
      try {
        const image = await deps.choose(source);
        if (revision !== generation || !active()) { if (image) deps.dispose(image); return; }
        if (image) {
          if (state.image) deps.dispose(state.image);
          publish({ image, lines: [], layout: null, read: false });
          if (autoRead) {
            reading = true;
            const { lines, layout } = ocrRecognition(await deps.recognize(image));
            if (revision === generation && active()) publish({ lines, layout, read: true });
          }
        }
      } catch (error) { if (revision === generation && active()) {
        const code = error instanceof ReceiptOcrError ? error.code : reading ? 'READ' : 'IMAGE';
        publish({ error: new ReceiptOcrError(code).message, errorCode: code });
      } }
      finally { if (revision === generation) publish({ busy: false }); }
    },
    async read() {
      if (!active() || state.busy || !state.image) return;
      const revision = ++generation, image = state.image; publish({ busy: true, error: '', errorCode: null, lines: [], layout: null, read: false });
      try {
        const { lines, layout } = ocrRecognition(await deps.recognize(image));
        if (revision === generation && active()) publish({ lines, layout, read: true });
      } catch (error) { if (revision === generation && active()) publish({ error: error instanceof ReceiptOcrError ? error.message : new ReceiptOcrError('READ').message, errorCode: error instanceof ReceiptOcrError ? error.code : 'READ' }); }
      finally { if (revision === generation) publish({ busy: false }); }
    },
  };
}
