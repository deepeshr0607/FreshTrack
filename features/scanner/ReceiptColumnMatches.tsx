import React, { useState } from 'react';
import { Text, View } from 'react-native';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { receiptColumnProposals, type ReceiptColumnMode } from '@/lib/receiptColumnReview';
import type { LocalReceiptCandidate } from '@/lib/receiptCandidates';
import type { ReceiptTextBox } from '@/lib/receiptTextBoxes';

export default function ReceiptColumnMatches({ lines, layout, rows, mode, onMode, onReview }: {
  lines: string[]; layout: ReceiptTextBox[]; rows: LocalReceiptCandidate[]; mode: ReceiptColumnMode; onMode(mode: ReceiptColumnMode): void; onReview(row: LocalReceiptCandidate): void;
}) {
  const [page, setPage] = useState(0);
  const proposals = receiptColumnProposals(lines, layout, rows, mode);
  const pages = Math.max(1, Math.ceil(proposals.length / 10));
  const current = Math.min(page, pages - 1);
  return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.heading}>Review Column Matches</Text>
    <Text style={ui.text}>Choose how your receipt is laid out. Suggested matches use text positions and can be wrong. Check the photo; nothing is replaced until you save its grocery review.</Text>
    <PrimaryButton label="Names Beside Amounts" variant={mode === 'same-row' ? 'primary' : 'ghost'} onPress={() => { onMode('same-row'); setPage(0); }} />
    <PrimaryButton label="Names Below Code & Amount" variant={mode === 'below-code' ? 'primary' : 'ghost'} onPress={() => { onMode('below-code'); setPage(0); }} />
    <Text accessibilityLiveRegion="polite" style={ui.text}>{proposals.length ? `${proposals.length} possible matches · Page ${current + 1} of ${pages}` : 'No unambiguous matches available. Use the current groceries, match unassigned lines manually, or Add Missing.'}</Text>
    {proposals.slice(current * 10, (current + 1) * 10).map(row => <View key={row.id} style={ui.card}>
      <Text style={ui.heading}>{row.draft.name}</Text>
      <Text style={ui.text}>Suggested amount: {row.detectedPrice} · {row.currency === 'unsupported' ? 'Foreign currency; INR value stays unknown' : row.currency === 'INR' ? 'INR' : 'Currency unverified; confirm INR'}</Text>
      <PrimaryButton label={`Review Column Match: ${row.draft.name}`} variant="ghost" onPress={() => onReview(row)} />
    </View>)}
    {pages > 1 && <>
      <PrimaryButton label="Previous Matches" variant="ghost" disabled={current === 0} onPress={() => setPage(current - 1)} />
      <PrimaryButton label="Next Matches" variant="ghost" disabled={current === pages - 1} onPress={() => setPage(current + 1)} />
    </>}
  </View>;
}
