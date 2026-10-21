import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import ReportSheet from '@/components/ReportSheet';
import ReconciliationBanner from '@/components/ReconciliationBanner';
import { useAuth } from '@/context/AuthContext';
import { useRealAnalytics } from '@/context/RealAnalyticsContext';
import { useRealPantry } from '@/context/RealPantryContext';
import { analyticsPeriodLabel, analyticsReport, consumedAmount, formatAnalyticsMoney } from '@/lib/analyticsPresentation';
import { Colors } from '@/constants/Theme';
import CategoryBreakdown from './CategoryBreakdown';
import UsedBeforeExpiry from './UsedBeforeExpiry';
import { a, AnalyticsAction, AnalyticsDisclosure, AnalyticsHeader, AnalyticsIcon } from './AnalyticsPresentation';
import { Comparison, MonthControls, MonthlyChart, PriceCoverage } from './AnalyticsParts';
export default function LiveAnalyticsScreen({ financial = false }: { financial?: boolean }) {
  const { state: auth } = useAuth(), { state, store } = useRealAnalytics(), pantry = useRealPantry();
  const [report, setReport] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    if (!auth.checking) { void store.load(); void pantry.overdueReview?.request(); }
  }, [store, auth.checking, pantry.overdueReview]));
  const data = state.data, row = data?.months[data.months.length - 1], consumed = row ? consumedAmount(row) : null;
  const empty = row && !row.wasted.count && !consumed?.count && !row.unconfirmed.count;
  return <PrototypeScreen header={<AnalyticsHeader financial={financial} onBack={() => router.dismissTo('/(tabs)/insights')} onSettings={() => router.push('/settings')}
    onReport={data ? () => setReport(analyticsReport(data)) : undefined} onRefresh={() => void store.load()} loading={state.status === 'loading'} />}>
    <View style={{ gap: 4 }}><Text style={a.title}>{financial ? 'Your financial record' : 'Small habits. Real impact.'}</Text><Text style={ui.text}>{financial ? 'Explore the details behind your kitchen activity.' : 'See what your kitchen used, and what went to waste.'}</Text></View>
    <MonthControls />
    {state.status === 'loading' && <ActivityIndicator accessibilityLabel="Loading household analytics" color={Colors.primary} />}
    {state.status === 'error' && <View style={ui.card}><Text style={ui.heading}>Analytics unavailable</Text><Text style={ui.text} accessibilityRole="alert">{state.error}</Text>
      <PrimaryButton label="Retry Analytics" onPress={() => void store.load()} /><PrimaryButton label="Open Pantry" variant="ghost" onPress={() => router.push('/(tabs)/pantry')} /></View>}
    {data && row && consumed && <>
      <Text style={ui.text}>{data.month} · {analyticsPeriodLabel(row.period)} · {data.timezone}</Text>
      {!!empty && <View style={ui.card}><Text style={ui.heading}>No outcomes recorded for this month</Text><Text style={ui.text}>Active groceries are not automatically counted as used or wasted.</Text><PrimaryButton label="Review Pantry" onPress={() => router.push('/(tabs)/pantry')} /></View>}
      {!financial ? <>
        <View style={a.hero}><View style={a.row}><AnalyticsIcon name="sprout-outline" color={Colors.inversePrimary} /><Text style={a.eyebrow}>CONSUMED · RECORDED VALUE</Text></View>
          <Text style={a.amount} adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={1}>{formatAnalyticsMoney(consumed.purchaseCostMinor)}</Text>
          <Text style={a.heroText}>{consumed.purchaseCount} priced entries · consumed value, not money saved</Text>
          <View style={a.heroStats}>{[{ label: 'On / before expiry', count: row.consumedBeforeOrOnExpiry.count }, { label: 'After expiry', count: row.consumedAfterExpiry.count }].map(entry =>
            <View key={entry.label} style={a.heroStat}><Text style={a.heroCount}>{entry.count}</Text><Text style={a.heroText}>{entry.label}</Text></View>)}</View>
        </View>
        <View style={a.metricRow}><View style={a.metric}><AnalyticsIcon name="check-circle-outline" /><Text style={a.metricValue}>{consumed.count}</Text><Text style={a.caption}>Confirmed used</Text></View><View style={a.metric}><AnalyticsIcon name="delete-outline" color={Colors.criticalRose} /><Text style={a.metricValue}>{row.wasted.count}</Text><Text style={a.caption}>Confirmed wasted</Text></View></View>
        <MonthlyChart data={data} />
        <PriceCoverage title="Confirmed Waste · Price Coverage" value={row.wasted} />
        <CategoryBreakdown data={data} />
        <AnalyticsAction title="Explore financial analytics" caption="Price coverage, monthly comparisons & grocery history" icon="chart-box-outline" onPress={() => router.push('/analytics/financial')} />
        <AnalyticsAction title="Plan Rescue Meals" caption="Put near-expiry groceries on your next menu" icon="chef-hat" onPress={() => router.push('/(tabs)/recipes')} />
        <AnalyticsAction title="Adjust Reminder Window" caption="Choose when your kitchen gives you a nudge" icon="bell-outline" onPress={() => router.push('/settings')} />
      </> : <>
        <View style={[ui.card, { backgroundColor: Colors.primary }]}><Text style={[ui.heading, { color: Colors.white }]}>Your Household's Monthly Record</Text><Text style={[ui.text, { color: Colors.white }]}>Confirmed outcomes and recorded prices · {row.month}</Text></View>
        <PriceCoverage title="Confirmed Consumed · Recorded Value" value={consumed} />
        <PriceCoverage title="Confirmed Waste · Recorded Value" value={row.wasted} />
        <Comparison data={data} />
        <MonthlyChart data={data} wasteOnly />
        <CategoryBreakdown data={data} waste />
        <UsedBeforeExpiry data={data} />
        <View style={ui.card}><Text style={ui.heading}>Unconfirmed Outcomes</Text><Text style={ui.text}>{row.unconfirmed.count} assumed or system-generated outcomes excluded from confirmed totals.</Text></View>
      </>}
      <AnalyticsDisclosure title="How your totals work">
        <Text style={ui.text}>Only confirmed effective outcomes count. Undo can revise an earlier month. {row.unconfirmed.count} unconfirmed outcomes are excluded.</Text>
        <Text style={ui.text}>Estimates and unknown prices are excluded from recorded-purchase totals. Whole-entry outcomes; partial consumption is not tracked.</Text>
        <Text style={ui.text}>Carbon, food mass and achievement scores are not calculated yet. Consumed value is not a savings estimate.</Text>
        <Text style={a.caption}>As of {data.asOf} · {data.timezone}</Text>
      </AnalyticsDisclosure>
    </>}
    <ReconciliationBanner compact />
    <ReportSheet report={report} onClose={() => setReport(null)} />
  </PrototypeScreen>;
}
