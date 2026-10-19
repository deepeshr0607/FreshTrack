/** Local-only OCR positions. Coordinates are normalized with a top-left origin. */
export interface ReceiptTextBox {
  id: string;
  text: string;
  box: { x: number; y: number; width: number; height: number };
}
export function receiptTextBoxes(value: unknown): ReceiptTextBox[] {
  if (!Array.isArray(value) || value.length > 500) throw Error('Invalid receipt layout.');
  let characters = 0;
  return Array.from(value, (line: unknown, index: number) => {
    if (!line || typeof line !== 'object') throw Error('Invalid receipt layout.');
    const { id, text, box } = line as ReceiptTextBox;
    if (id !== `line-${index}` || typeof text !== 'string' || !text.trim() || text !== text.trim() ||
      /[\r\n]/.test(text) || text.length > 10000 || (characters += text.length + 1) > 50001 || !box ||
      ![box.x, box.y, box.width, box.height].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1) ||
      box.width <= 0 || box.height <= 0 || box.x + box.width > 1.000001 || box.y + box.height > 1.000001) {
      throw Error('Invalid receipt layout.');
    }
    return { id, text, box: { ...box } };
  });
}
