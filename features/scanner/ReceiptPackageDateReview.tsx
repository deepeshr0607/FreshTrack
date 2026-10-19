import React, { useState } from 'react';
import { Text, View } from 'react-native';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import type { ExpiryDraft } from '@/lib/pantryExpiry';
import { confirmPrintedReceiptDate, receiptPackageDateLabel, type ReceiptPackageDateReview as PackageReview } from '@/lib/receiptPackageDates';

export default function ReceiptPackageDateReview({ name, expiry, review, onReview, onExpiry }: {
  name: string; expiry: ExpiryDraft; review: PackageReview; onReview(value: PackageReview): void; onExpiry(value: ExpiryDraft): void;
}) {
  const [error, setError] = useState('');
  const current = review.kind === 'printed' && (review.name !== name || review.date !== expiry.packageDate) ? { kind: 'unchecked' as const } : review;
  const choose = (kind: 'unavailable' | 'not-applicable') => {
    onExpiry({ ...expiry, packageDate: '' }); onReview({ kind }); setError('');
  };
  return <View style={ui.card}>
    <Text style={ui.heading}>Package date review</Text>
    <Text accessibilityLiveRegion="polite" style={ui.label}>{receiptPackageDateLabel(current)}</Text>
    <Text style={ui.text}>For packaged food, check its printed expiry, use-by or best-before date. A manufacture date or receipt date is not that date. Receipt OCR does not verify a package label.</Text>
    {!!expiry.packageDate && <PrimaryButton label="I Checked This Printed Date" variant="ghost" onPress={() => {
      try { onReview(confirmPrintedReceiptDate(name, expiry.packageDate)); setError(''); }
      catch (problem) { setError((problem as Error).message); }
    }} />}
    <PrimaryButton label="Printed Date Unreadable / Unavailable" variant="ghost" onPress={() => choose('unavailable')} />
    <PrimaryButton label="Loose / Fresh Item — No Package Date" variant="ghost" onPress={() => choose('not-applicable')} />
    <Text style={ui.text}>Those choices clear the package-date field. They do not invent another date. Enter your own manual date or explicitly choose an estimate, or leave this grocery unreviewed until you can check it. Manual dates and estimates remain unverified against a printed label.</Text>
    {!!error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{error}</Text>}
  </View>;
}
