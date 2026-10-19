// @ts-expect-error Explicit extension supports strip-types tests and Metro.
import { RECEIPT_COLUMN_FIXTURE } from './receiptGeometryFixtures.ts';
import type { ReceiptTextBox } from './receiptTextBoxes';
/** Synthetic local diagnostics only; never substituted for a photographed receipt. */
export const RECEIPT_LAYOUT_FIXTURES: { name: string; lines: string[]; layout?: ReceiptTextBox[] }[] = [
  { name: 'Separate INR columns', lines: ['ITEM DESCRIPTION', 'Layout Test Rice', 'Layout Test Milk', '₹40.00', 'Rs. 60.50', 'TOTAL 100.50', 'UPI 100.50'] },
  { name: 'Foreign amount and uncertain lines', lines: ['ITEM DESCRIPTION', 'Layout Test Yogurt', '$4.29', 'Discount -5.00', 'Rice 1,200.00', 'TOTAL 4.29'] },
  { name: 'Items without prices', lines: ['FRESHTRACK SAMPLE MARKET', 'ITEM DESCRIPTION', 'Milk', 'Bananas', 'Chicken breast', 'Whole wheat bread', 'Basmati rice', 'Chocolate biscuits', '₹60.00', 'TOTAL 60.00', 'Milk Road', 'Cashier: Milk', 'Unclear product XYZ'] },
  { name: 'Quantity review', lines: ['ITEM DESCRIPTION', '0.750 kg Apples Rs. 45.00', '2 x Milk 500ml Rs. 120.00', 'Eggs Qty: 6 pcs Rs. 60.00', 'Milk 500ml', 'Bananas Qty: 2 kg', 'TOTAL 225.00'] },
  { name: 'Abbreviation review', lines: ['ITEM DESCRIPTION', 'MKL LOPFT 1L Rs. 60.00', 'CHKN BRST Qty: 0.5 kg Rs. 150.00', 'WW BRD Rs. 40.00', 'BNNA', 'TMTO', 'MKL UNKNOWN', 'Milk Road', 'TOTAL 250.00'] },
  { name: 'Grouped INR prices', lines: ['Currency: INR', 'Rice ₹1,200.00', 'Oil Rs. 1,23,456.78', 'Milk ₹0.00', 'Discount -100.00', 'Rice discount 100.00', 'TOTAL 124556.78'] },
  { name: 'Foreign currency receipt', lines: ['Amount (RM)', 'Milk 9.00', 'Bread RM4.50', 'Bananas', '2.50', 'TOTAL 16.00'] },
  { name: 'Long receipt (50 items)', lines: ['ITEM DESCRIPTION', ...Array.from({ length: 50 }, (_, index) => `Long Receipt Rice ${String(index + 1).padStart(2, '0')} Rs. ${index + 1}.00`), 'TOTAL 1275.00'] },
  { name: 'Food category review', lines: ['ITEM DESCRIPTION', 'Apples Rs. 40.00', 'MKL LOPFT 1L Rs. 60.00', 'CHKN BRST Rs. 120.00', 'Whole wheat bread Rs. 30.00', 'Milk biscuits Rs. 25.00', 'Frozen spinach Rs. 50.00', 'Chicken soup Rs. 80.00', 'Rice Rs. 100.00', 'Unknown product XYZ Rs. 15.00', 'Milk cheese Rs. 70.00', 'TOTAL 690.00'] },
  { name: 'Storage expiry review', lines: ['ITEM DESCRIPTION', 'Spinach Rs. 30.00', 'Chicken breast Rs. 120.00', 'Potatoes Rs. 40.00', 'Milk Rs. 60.00', 'Milk biscuits Rs. 25.00', 'Frozen spinach Rs. 50.00', 'TOTAL 325.00'] },
  { name: 'Milk and rice expiry review', lines: ['ITEM DESCRIPTION', 'Milk Rs. 60.00', 'Rice Rs. 100.00', 'Brown rice Rs. 90.00', 'Cooked rice Rs. 40.00', 'UHT milk Rs. 70.00', 'Raw milk Rs. 50.00', 'Milk biscuits Rs. 25.00', 'TOTAL 435.00'] },
  { name: 'Project showcase (20 foods)', lines: ['ITEM DESCRIPTION', ...[
    'Apples', 'Bananas', 'Oranges', 'Grapes', 'Strawberries', 'Pears', 'Spinach', 'Lettuce', 'Carrots', 'Broccoli',
    'Cabbage', 'Potatoes', 'Onions', 'Chicken breast', 'Fish', 'Beef steak', 'Eggs', 'Milk', 'White rice', 'Brown rice',
  ].map(name => `${name} Rs. 100.00`), 'TOTAL 2000.00'] },
  { name: 'Package date review', lines: ['ITEM DESCRIPTION', 'Chocolate biscuits Rs. 30.00', 'Milk Rs. 60.00', 'Rice Rs. 100.00', 'Apples Rs. 40.00', 'TOTAL 230.00'] },
  RECEIPT_COLUMN_FIXTURE,
];
