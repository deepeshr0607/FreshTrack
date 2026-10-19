import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import { receiptExpiryLabel } from '@/lib/receiptCandidates';
import { rupeeValue } from '@/lib/pantryApi';
import type { createReceiptImportController } from '@/lib/receiptImport';

type Controller = ReturnType<typeof createReceiptImportController>;
export default function ReceiptImportView({ controller, state, readOnly, onNewReceipt, diagnostics = false }: {
  controller: Controller; state: ReturnType<Controller['getSnapshot']>; readOnly: boolean; onNewReceipt(): void; diagnostics?: boolean;
}) {
  if (state.ready && state.stage === 'idle') return null;
  const retryDisabled = state.busy || readOnly;
  return <View style={ui.card}>
    <Text accessibilityRole="header" style={ui.title}>{!state.ready ? 'Checking Saved Receipt' : state.stage === 'saved' ? '✓ Haul Saved' : state.stage === 'pending' ? 'Saved Receipt Retry' : 'Confirm Receipt Haul'}</Text>
    {state.busy && <Text accessibilityRole="progressbar" style={ui.text}>Checking or saving your reviewed haul…</Text>}
    {readOnly && <Text accessibilityRole="alert" style={ui.text}>Cached Pantry is read-only. Return to Pantry and refresh online before reviewing or saving this haul.</Text>}
    {!!state.error && <Text accessibilityRole="alert" style={[ui.text, { color: Colors.error }]}>{state.error}</Text>}
    {!state.ready ? <PrimaryButton label="Retry Saved Receipt Check" loading={state.busy} onPress={() => void controller.restore()} /> : state.stage === 'saved' ? <>
      <Text style={ui.text}>{state.result!.items.length} groceries saved to your household. {state.result!.replayed ? 'The original save was recovered; no new purchases were created by this retry.' : 'The receipt and groceries were saved together.'}</Text>
      <Text style={ui.text}>A recovered item may now have a later Used/Wasted outcome. The retry does not restore it.</Text>
      <PrimaryButton label="View Pantry" onPress={() => router.dismissTo('/(tabs)/pantry')} />
      <PrimaryButton label="Scan Another Receipt" variant="ghost" onPress={onNewReceipt} />
    </> : state.stage === 'pending' ? <>
      <Text style={ui.text}>{state.pending!.paused ? (diagnostics ? 'Receipt sync paused for the development retry test. No import has been sent by this test yet.' : 'Your confirmed receipt is saved on this device and waiting to be sent.') : 'This confirmed haul is saved on this device. Its server result may be uncertain. Retry the unchanged request to recover the result.'}</Text>
      {state.pending!.input.items.map(row => <View key={row.rowId} style={ui.card}><Text style={ui.heading}>{row.item.name}</Text>
        <Text style={ui.text}>{row.item.quantity} {row.item.unit} · {rupeeValue(row.item.totalCostMinor)} · {receiptExpiryLabel(row.item)}</Text></View>)}
      <Text style={ui.text}>Editing and new receipt imports are locked until this request is resolved. Closing and reopening the app keeps this retry. Signing out removes its local copy; groceries already saved online remain.</Text>
      {(!state.pending!.paused || diagnostics) && <PrimaryButton label="Retry Saved Import" loading={state.busy} disabled={readOnly} onPress={() => void controller.retry()} />}
      {state.pending!.paused && <PrimaryButton label={diagnostics ? 'End Retry Test & Import' : 'Continue Saved Import'} disabled={retryDisabled} onPress={() => void controller.retry(true)} />}
    </> : <>
      <Text style={ui.text}>Only the reviewed fields below will be sent. Photos and raw OCR text stay on this device. Confirming adds new purchases; existing groceries stay unchanged.</Text>
      {state.input?.items.map(row => {
        const duplicate = state.duplicates?.find(match => match.rowId === row.rowId);
        const needsChoice = !!duplicate && (duplicate.total > 0 || duplicate.withinHaul.length > 0);
        return <View key={row.rowId} style={[ui.card, { backgroundColor: Colors.surfaceContainerLow }]}>
          <Text style={ui.heading}>{row.item.name}</Text>
          <Text style={ui.text}>{row.item.category} · {row.item.quantity} {row.item.unit} · {rupeeValue(row.item.totalCostMinor)} · {receiptExpiryLabel(row.item)}</Text>
          {needsChoice && <>
            <Text style={ui.text}>Possible duplicate: {duplicate.total} existing purchases; {duplicate.withinHaul.length} matching rows in this haul.</Text>
            {duplicate.matches.map(item => <Text key={item.id} style={ui.text}>Existing: {item.name} · {item.quantity} {item.unit} · {rupeeValue(item.totalCostMinor)} · {item.expiresOn}</Text>)}
            {duplicate.total > duplicate.matches.length && <Text style={ui.text}>Showing the five most recent matches.</Text>}
            <PrimaryButton label={state.choices[row.rowId] === 'skip' ? '✓ Skip This Row' : 'Skip This Row'} variant="ghost" disabled={state.busy} onPress={() => controller.choose(row.rowId, 'skip')} />
            <PrimaryButton label={state.choices[row.rowId] === 'separate' ? '✓ Add Separately' : 'Add Separately'} variant="ghost" disabled={state.busy} onPress={() => controller.choose(row.rowId, 'separate')} />
          </>}
        </View>;
      })}
      {state.duplicates ? <>
        <Text style={ui.heading}>{state.input!.items.filter(row => state.choices[row.rowId] !== 'skip').length} groceries to add</Text>
        <PrimaryButton label="Confirm Add Haul to Pantry" disabled={retryDisabled} onPress={() => void controller.confirm()} />
        {DIAGNOSTICS_ENABLED && diagnostics && <PrimaryButton label="Confirm & Save Retry Test (No Send)" variant="ghost" disabled={retryDisabled} onPress={() => void controller.confirm(true)} />}
      </> : <PrimaryButton label="Check Duplicates Again" loading={state.busy} disabled={readOnly || !state.input} onPress={() => { if (state.input) void controller.review(state.input); }} />}
      <PrimaryButton label="Cancel — Back to Review" variant="ghost" disabled={state.busy} onPress={() => controller.cancel()} />
    </>}
  </View>;
}
