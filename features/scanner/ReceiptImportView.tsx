import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrimaryButton from '@/components/PrimaryButton';
import { Colors } from '@/constants/Theme';
import { receiptExpiryLabel } from '@/lib/receiptCandidates';
import { rupeeValue } from '@/lib/pantryApi';
import type { createReceiptImportController } from '@/lib/receiptImport';
import { ReviewDisclosure, ReviewHeading, ReviewIcon, ReviewStats, r } from './ReceiptReviewPresentation';

type Controller = ReturnType<typeof createReceiptImportController>;
export default function ReceiptImportView({ controller, state, readOnly, onNewReceipt, diagnostics = false }: {
  controller: Controller; state: ReturnType<Controller['getSnapshot']>; readOnly: boolean; onNewReceipt(): void; diagnostics?: boolean;
}) {
  if (state.ready && state.stage === 'idle') return null;
  const retryDisabled = state.busy || readOnly;
  const adding = state.input?.items.filter(row => state.choices[row.rowId] !== 'skip') ?? [];
  const priced = adding.filter(row => row.item.totalCostMinor !== null);
  return <View style={{ gap: 16 }}>
    <ReviewHeading title={!state.ready ? 'Checking saved receipt' : state.stage === 'saved' ? 'All stocked up!' : state.stage === 'pending' ? 'Your haul is waiting' : 'Ready for your pantry?'}
      subtitle={!state.ready ? 'Looking for an unfinished save.' : state.stage === 'saved' ? 'Your groceries are in their new home.' : state.stage === 'pending' ? 'Finish your saved import before starting another.' : 'One last look before adding your groceries.'}
      icon={state.stage === 'saved' ? 'check-circle-outline' : state.stage === 'pending' ? 'cloud-upload-outline' : 'basket-check-outline'} />
    {state.busy && <View style={r.info} accessibilityRole="progressbar"><ActivityIndicator color={Colors.primary} /><Text style={r.body}>Checking or saving your reviewed haul…</Text></View>}
    {readOnly && <View style={r.info}><Text accessibilityRole="alert" style={r.warning}>Cached Pantry is read-only. Return to Pantry and refresh online before reviewing or saving this haul.</Text></View>}
    {!!state.error && <View style={r.info}><Text accessibilityRole="alert" style={[r.body, { color: Colors.error }]}>{state.error}</Text></View>}
    {!state.ready ? <PrimaryButton label="Retry Saved Receipt Check" loading={state.busy} onPress={() => void controller.restore()} /> : state.stage === 'saved' ? <>
      <View style={r.success}><ReviewIcon name="check-decagram-outline" size={56} /><Text style={r.title}>{state.result!.items.length} groceries saved</Text><Text style={r.body}>{state.result!.replayed ? 'Your original save was recovered. No new purchases were created by this retry.' : 'The receipt and groceries were saved together.'}</Text></View>
      {state.result!.replayed && <Text style={r.caption}>A recovered item may now have a later Used/Wasted outcome. The retry does not restore it.</Text>}
      <PrimaryButton label="View Pantry" onPress={() => router.dismissTo('/(tabs)/pantry')} />
      <PrimaryButton label="Scan Another Receipt" variant="ghost" onPress={onNewReceipt} />
    </> : state.stage === 'pending' ? <>
      <View style={r.info}><Text style={r.body}>{state.pending!.paused ? (diagnostics ? 'Receipt sync paused for the development retry test. No import has been sent by this test yet.' : 'Your confirmed receipt is saved on this device and waiting to be sent.') : 'This confirmed haul is saved on this device. Its server result may be uncertain. Retry the unchanged request to recover the result.'}</Text></View>
      {state.pending!.input.items.map(row => <View key={row.rowId} style={r.product}><View style={r.compactRow}><Text style={r.productName}>{row.item.name}</Text><Text style={r.actionText}>{rupeeValue(row.item.totalCostMinor)}</Text></View>
        <Text style={r.body}>{row.item.quantity} {row.item.unit}</Text><Text style={r.caption}>{receiptExpiryLabel(row.item)}</Text></View>)}
      <Text style={r.body}>Editing and new imports are locked until this save is resolved.</Text>
      <ReviewDisclosure title="About this saved retry"><Text style={r.body}>Closing and reopening keeps this retry. Signing out removes its local copy; groceries already saved online remain. Retry recovers the original result rather than creating another purchase.</Text></ReviewDisclosure>
      {(!state.pending!.paused || diagnostics) && <PrimaryButton label="Retry Saved Import" loading={state.busy} disabled={readOnly} onPress={() => void controller.retry()} />}
      {state.pending!.paused && <PrimaryButton label={diagnostics ? 'End Retry Test & Import' : 'Continue Saved Import'} disabled={retryDisabled} onPress={() => void controller.retry(true)} />}
    </> : <>
      <ReviewStats stats={[{ label: 'To add', value: adding.length }, { label: 'Known value', value: rupeeValue(priced.reduce((sum, row) => sum + row.item.totalCostMinor!, 0)) }]} />
      <Text style={r.caption}>{priced.length} of {adding.length} products priced · Unknown values excluded</Text>
      <Text style={r.body}>These are new purchases. Your existing groceries stay unchanged.</Text>
      {state.input?.items.map(row => {
        const duplicate = state.duplicates?.find(match => match.rowId === row.rowId);
        const needsChoice = !!duplicate && (duplicate.total > 0 || duplicate.withinHaul.length > 0);
        const skipped = state.choices[row.rowId] === 'skip';
        return <View key={row.rowId} style={[r.product, needsChoice && { borderColor: '#EAC991' }, skipped && { backgroundColor: Colors.surfaceContainerLow }]}>
          <View style={r.productTop}><View style={r.food}><ReviewIcon name={skipped ? 'minus-circle-outline' : 'basket-outline'} size={25} /></View><View style={{ flex: 1 }}><Text style={r.productName}>{row.item.name}</Text><Text style={r.body}>{row.item.quantity} {row.item.unit} · {rupeeValue(row.item.totalCostMinor)}</Text></View></View>
          <Text style={r.category}>{row.item.category}</Text>
          <View style={r.expiry}><ReviewIcon name="calendar-check-outline" size={18} /><Text style={r.expiryText}>{receiptExpiryLabel(row.item)}</Text></View>
          {needsChoice && <View style={{ gap: 10 }}>
            <Text style={r.warning}>Possible duplicate</Text><Text style={r.caption}>{duplicate.total} existing {duplicate.total === 1 ? 'purchase' : 'purchases'} · {duplicate.withinHaul.length} matching rows in this haul</Text>
            {!!duplicate.matches.length && <ReviewDisclosure title={`View matching purchases for ${row.item.name}`}>
              {duplicate.matches.map(item => <Text key={item.id} style={r.body}>{item.name} · {item.quantity} {item.unit} · {rupeeValue(item.totalCostMinor)} · {item.expiresOn}</Text>)}
              {duplicate.total > duplicate.matches.length && <Text style={r.caption}>Showing the five most recent matches.</Text>}
            </ReviewDisclosure>}
            <View style={r.choiceRow}>{([{ key: 'skip', label: 'Skip This Row' }, { key: 'separate', label: 'Add Separately' }] as const).map(choice => <Pressable key={choice.key}
              accessibilityRole="radio" accessibilityLabel={`${choice.label}: ${row.item.name}`} accessibilityState={{ checked: state.choices[row.rowId] === choice.key, disabled: state.busy }}
              disabled={state.busy} onPress={() => controller.choose(row.rowId, choice.key)} style={[r.choice, state.choices[row.rowId] === choice.key && r.selectedChoice, state.busy && { opacity: 0.5 }]}>
              <Text style={[r.choiceText, state.choices[row.rowId] === choice.key && { color: Colors.white }]}>{choice.label}</Text></Pressable>)}</View>
          </View>}
        </View>;
      })}
      <ReviewDisclosure title="What gets saved?"><Text style={r.body}>Only these reviewed grocery fields are sent. Receipt photos and raw text stay on this device. Nothing is added until you confirm.</Text></ReviewDisclosure>
      {state.duplicates ? <>
        <Text style={r.sectionTitle}>{adding.length} {adding.length === 1 ? 'grocery' : 'groceries'} to add</Text>
        <PrimaryButton label="Confirm Add Haul to Pantry" disabled={retryDisabled} onPress={() => void controller.confirm()} />
        {DIAGNOSTICS_ENABLED && diagnostics && <PrimaryButton label="Confirm & Save Retry Test (No Send)" variant="ghost" disabled={retryDisabled} onPress={() => void controller.confirm(true)} />}
      </> : <PrimaryButton label="Check Duplicates Again" loading={state.busy} disabled={readOnly || !state.input} onPress={() => { if (state.input) void controller.review(state.input); }} />}
      <PrimaryButton label="Cancel — Back to Review" variant="ghost" disabled={state.busy} onPress={() => controller.cancel()} />
    </>}
  </View>;
}
