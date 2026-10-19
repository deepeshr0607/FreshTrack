/** Synthetic local diagnostics only; never substituted for a photographed receipt. */
export const RECEIPT_LAYOUT_FIXTURES: { name: string; lines: string[] }[] = [
  { name: 'Separate INR columns', lines: ['ITEM DESCRIPTION', 'Layout Test Rice', 'Layout Test Milk', '₹40.00', 'Rs. 60.50', 'TOTAL 100.50', 'UPI 100.50'] },
  { name: 'Foreign amount and uncertain lines', lines: ['ITEM DESCRIPTION', 'Layout Test Yogurt', '$4.29', 'Discount -5.00', 'Rice 1,200.00', 'TOTAL 4.29'] },
];
