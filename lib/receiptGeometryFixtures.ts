import type { ReceiptTextBox } from './receiptTextBoxes';
/** Synthetic coordinates for explicit local phone review; never substituted for real OCR. */
const cells: [string, number, number, number][] = [
  ['Item', .1, .1, .15], ['Qty', .4, .1, .1], ['Amount (INR)', .75, .1, .15],
  ['123456789012; 2', .1, .2, .25], ['10.00', .5, .2, .1], ['60.50', .8, .2, .1], ['Milk', .1, .23, .15],
  ['987654321098', .1, .28, .23], ['25.00', .8, .28, .1], ['Bread', .1, .31, .15],
  ['Total', .1, .37, .15], ['85.50', .8, .37, .1],
];
export const RECEIPT_COLUMN_FIXTURE: { name: string; lines: string[]; layout: ReceiptTextBox[] } = {
  name: 'Positioned column review', lines: cells.map(([text]) => text),
  layout: cells.map(([text, x, y, width], i) => ({ id: `line-${i}`, text, box: { x, y, width, height: .02 } })),
};
