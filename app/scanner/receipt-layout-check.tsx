import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import LocalReceiptReview from '@/features/scanner/LocalReceiptReview';
import { RECEIPT_LAYOUT_FIXTURES } from '@/lib/receiptLayoutFixtures';
import { rupeeValue } from '@/lib/pantryApi';
import type { ReceiptReviewInput } from '@/types/api';

/** Deterministic phone UI exercise. No OCR, API, persistence or inventory operations. */
export default function ReceiptLayoutCheck() {
  const { state } = useAuth();
  const [fixture, setFixture] = useState(0), [revision, setRevision] = useState(0);
  const [prepared, setPrepared] = useState<ReceiptReviewInput | null>(null);
  const selected = RECEIPT_LAYOUT_FIXTURES[fixture]!;
  const reset = (index = fixture) => { setFixture(index); setPrepared(null); setRevision(value => value + 1); };
  return <PrototypeScreen back={() => router.dismissTo('/(tabs)/scanner')}>
    <Text style={ui.title}>Receipt Layout Check</Text>
    {!__DEV__ || !state.user || state.demo ? <Text style={ui.text}>Use Receipt OCR from Scanner. This local exercise requires a development account.</Text> : <>
      <Text style={ui.text}>Synthetic text fixture · No camera recognition, household request or Pantry saving. This checks the same review controls used by real receipts.</Text>
      {RECEIPT_LAYOUT_FIXTURES.map((item, index) => <PrimaryButton key={item.name} label={item.name} variant={fixture === index ? 'primary' : 'ghost'} onPress={() => reset(index)} />)}
      <View style={ui.card}><Text style={ui.heading}>Fixture text</Text><Text selectable style={ui.text}>{selected.lines.join('\n')}</Text></View>
      <LocalReceiptReview key={`${fixture}-${revision}`} localOnly lines={selected.lines} layout={selected.layout} onPrepare={setPrepared} />
      {prepared && <View style={ui.card}><Text style={ui.heading}>Confirmed Fields · Local Only</Text>
        {prepared.items.map(row => <Text key={row.rowId} style={ui.text}>{row.item.name} · {row.item.quantity} {row.item.unit} · {rupeeValue(row.item.totalCostMinor)} · {row.item.expiresOn}</Text>)}
        <Text style={ui.text}>Nothing was sent or saved. Original OCR/provenance is excluded from these reviewed fields.</Text>
      </View>}
      <PrimaryButton label="Reset Layout Check" variant="ghost" onPress={() => reset()} />
    </>}
  </PrototypeScreen>;
}
