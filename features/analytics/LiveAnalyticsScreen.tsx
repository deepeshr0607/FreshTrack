import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import ScreenHeader from '@/components/ScreenHeader';
import PrimaryButton from '@/components/PrimaryButton';
import ReportSheet from '@/components/ReportSheet';
import ReconciliationBanner from '@/components/ReconciliationBanner';
import { useAuth } from '@/context/AuthContext';
import { useRealAnalytics } from '@/context/RealAnalyticsContext';
import { useRealPantry } from '@/context/RealPantryContext';
import { analyticsPeriodLabel, analyticsReport, consumedAmount, formatAnalyticsMoney } from '@/lib/analyticsPresentation';
import { Colors } from '@/constants/Theme';
import CategoryBreakdown from './CategoryBreakdown';
import { Comparison, MonthControls, MonthlyChart, PriceCoverage } from './AnalyticsParts';
export default function LiveAnalyticsScreen({ financial = false }: { financial?: boolean }) {
  const { state: auth } = useAuth(), { state, store } = useRealAnalytics(), pantry = useRealPantry();
  const [report, setReport] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    if (!auth.checking) { void store.load(); void pantry.overdueReview?.request(); }
  }, [store, auth.checking, pantry.overdueReview]));
  const data = state.data, row = data?.months[data.months.length - 1], consumed = row ? consumedAmount(row) : null;
  const empty = row && !row.wasted.count && !consumed?.count && !row.unconfirmed.count;
  return <PrototypeScreen back={financial ? () => router.dismissTo('/(tabs)/insights') : undefined}
    header={financial ? undefined : <ScreenHeader title="FreshTrack" subtitle="Analytics" showNotification={false} onAvatarPress={() => router.push('/settings')} />}>
    <View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.label}>MONTHLY AUDIT</Text><Text style={ui.title}>{financial ? 'Impact & Financial Analytics' : 'Insights & Impact'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Preview household analytics report" disabled={!data} style={ui.pill} onPress={() => data && setReport(analyticsReport(data))}><Text style={ui.label}>↥ Report</Text></Pressable></View>
    <MonthControls />
    <PrimaryButton label="Refresh Analytics" loading={state.status === 'loading'} onPress={() => void store.load()} />
    {state.status === 'loading' && <ActivityIndicator accessibilityLabel="Loading household analytics" color={Colors.primary} />}
    {state.status === 'error' && <View style={ui.card}><Text style={ui.heading}>Analytics unavailable</Text><Text style={ui.text} accessibilityRole="alert">{state.error}</Text>
      <PrimaryButton label="Retry Analytics" onPress={() => void store.load()} /><PrimaryButton label="Open Pantry" variant="ghost" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {data && row && consumed && <>
      <Text style={ui.text}>{data.month} · {analyticsPeriodLabel(row.period)} · {data.timezone}</Text>
      {!!empty && <View style={ui.card}><Text style={ui.heading}>No outcomes recorded for this month</Text><Text style={ui.text}>Active groceries are not automatically counted as used or wasted.</Text><PrimaryButton label="Review Pantry" onPress={() => router.push('/(tabs)/pantry')} /></View>}
      {!financial ? <>
        <View style={[ui.card, { backgroundColor: Colors.primary }]}><Text style={[ui.label, { color: Colors.inversePrimary }]}>♧ CONSUMED · RECORDED PURCHASE VALUE</Text>
          <Text style={[ui.large, { color: Colors.white }]}>{formatAnalyticsMoney(consumed.purchaseCostMinor)}</Text>
          <Text style={[ui.text, { color: Colors.white }]}>{consumed.purchaseCount} priced entries. This is consumed value, not estimated money saved.</Text>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>{[{ label: 'On/before expiry', count: row.consumedBeforeOrOnExpiry.count }, { label: 'After expiry', count: row.consumedAfterExpiry.count }].map(entry =>
            <View key={entry.label} style={{ flex: 1, minWidth: 110, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)' }}><Text style={[ui.large, { color: Colors.white, fontSize: 26 }]}>{entry.count}</Text><Text style={[ui.text, { color: Colors.white }]}>{entry.label} entries</Text></View>)}</View>
        </View>
        <MonthlyChart data={data} />
        <View style={[ui.card, { backgroundColor: Colors.surfaceContainerHigh }]}><Text style={ui.heading}>Kitchen Activity</Text><Text style={ui.text}>{consumed.count} confirmed used · {row.wasted.count} confirmed wasted · {row.unconfirmed.count} unconfirmed outcomes excluded</Text>
          <Text style={ui.text}>Only confirmed effective outcomes count. Undo can revise an earlier month.</Text></View>
        <PriceCoverage title="Confirmed Waste · Price Coverage" value={row.wasted} />
        <CategoryBreakdown data={data} />
        <View style={[ui.card, { borderLeftWidth: 5, borderLeftColor: Colors.primary }]}><Text style={ui.heading}>Plan Your Next Rescue</Text><Text style={ui.text}>Check near-expiry groceries before planning meals.</Text>
          <PrimaryButton label="Plan Rescue Meals" onPress={() => router.push('/(tabs)/recipes')} /><PrimaryButton label="Adjust Reminder Window" variant="ghost" onPress={() => router.push('/settings')} /></View>
        <PrimaryButton label="Impact & Financial Analytics →" variant="ghost" onPress={() => router.push('/analytics/financial')} />
      </> : <>
        <View style={[ui.card, { backgroundColor: Colors.primary }]}><Text style={[ui.heading, { color: Colors.white }]}>Your Household's Monthly Record</Text><Text style={[ui.text, { color: Colors.white }]}>Confirmed outcomes and recorded prices · {row.month}</Text></View>
        <PriceCoverage title="Confirmed Consumed · Recorded Value" value={consumed} />
        <PriceCoverage title="Confirmed Waste · Recorded Value" value={row.wasted} />
        <Comparison data={data} />
        <MonthlyChart data={data} wasteOnly />
        <CategoryBreakdown data={data} waste />
        <View style={ui.card}><Text style={ui.heading}>Unconfirmed Outcomes</Text><Text style={ui.text}>{row.unconfirmed.count} assumed or system-generated outcomes excluded from confirmed totals.</Text></View>
      </>}
      <View style={ui.card}><Text style={ui.heading}>Impact Metrics</Text><Text style={ui.text}>Carbon, food mass, achievement scores and individual rescue rankings are not calculated in this view yet.</Text></View>
      <Text style={[ui.text, { fontSize: 11 }]}>As of {data.asOf}. Estimates and unknown prices are excluded from recorded-purchase totals. Whole-entry outcomes; partial consumption is not tracked.</Text>
    </>}
    <ReconciliationBanner />
    <ReportSheet report={report} onClose={() => setReport(null)} />
  </PrototypeScreen>;
}
