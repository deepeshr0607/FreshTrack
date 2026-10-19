/** Synthetic local diagnostics only; never substituted for a photographed receipt. */
export const RECEIPT_LAYOUT_FIXTURES: { name: string; lines: string[] }[] = [
  { name: 'Separate INR columns', lines: ['ITEM DESCRIPTION', 'Layout Test Rice', 'Layout Test Milk', '₹40.00', 'Rs. 60.50', 'TOTAL 100.50', 'UPI 100.50'] },
  { name: 'Foreign amount and uncertain lines', lines: ['ITEM DESCRIPTION', 'Layout Test Yogurt', '$4.29', 'Discount -5.00', 'Rice 1,200.00', 'TOTAL 4.29'] },
  { name: 'Items without prices', lines: ['FRESHTRACK SAMPLE MARKET', 'ITEM DESCRIPTION', 'Milk', 'Bananas', 'Chicken breast', 'Whole wheat bread', 'Basmati rice', 'Chocolate biscuits', '₹60.00', 'TOTAL 60.00', 'Milk Road', 'Cashier: Milk', 'Unclear product XYZ'] },
  { name: 'Quantity review', lines: ['ITEM DESCRIPTION', '0.750 kg Apples Rs. 45.00', '2 x Milk 500ml Rs. 120.00', 'Eggs Qty: 6 pcs Rs. 60.00', 'Milk 500ml', 'Bananas Qty: 2 kg', 'TOTAL 225.00'] },
  { name: 'Abbreviation review', lines: ['ITEM DESCRIPTION', 'MKL LOPFT 1L Rs. 60.00', 'CHKN BRST Qty: 0.5 kg Rs. 150.00', 'WW BRD Rs. 40.00', 'BNNA', 'TMTO', 'MKL UNKNOWN', 'Milk Road', 'TOTAL 250.00'] },
];
