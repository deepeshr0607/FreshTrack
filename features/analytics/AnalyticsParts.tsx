import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import PrimaryButton from '@/components/PrimaryButton';
import { ui } from '@/components/PrototypeScreen';
import { useRealAnalytics } from '@/context/RealAnalyticsContext';
import { a, AnalyticsDisclosure, AnalyticsIcon } from './AnalyticsPresentation';
import { Colors } from '@/constants/Theme';
import type { AnalyticsAmount, AnalyticsSeries } from '@/types/api';
import { analyticsBarPercent, consumedAmount, formatAnalyticsMoney, shiftAnalyticsMonth } from '@/lib/analyticsPresentation';
export function MonthControls() {
  const { state, store } = useRealAnalytics();
  const month = state.data?.month ?? state.month ?? '';
  const [draft, setDraft] = useState(month);
  const [choosing, setChoosing] = useState(false);
  useEffect(() => { setDraft(month); }, [month]);
  const move = (offset: number) => { const next = shiftAnalyticsMonth(month, offset); if (next) void store.load(next); };
  return <View style={a.card}>
    <View style={ui.row}><Pressable accessibilityRole="button" accessibilityLabel="Previous analytics month" disabled={!month} style={a.round} onPress={() => move(-1)}><AnalyticsIcon name="chevron-left" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose analytics month" accessibilityState={{ expanded: choosing }} style={[a.row, { flex: 1, justifyContent: 'center', minHeight: 44 }]} onPress={() => setChoosing(value => !value)}><AnalyticsIcon name="calendar-month-outline" size={19} /><Text style={a.heading}>{month || 'Household month'}</Text><AnalyticsIcon name={choosing ? 'chevron-up' : 'chevron-down'} size={18} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Next analytics month" disabled={!month} style={a.round} onPress={() => move(1)}><AnalyticsIcon name="chevron-right" /></Pressable></View>
    {choosing && <View style={{ gap: 8 }}><View style={[ui.row, { flexWrap: 'wrap' }]}><TextInput value={draft} onChangeText={setDraft} placeholder="YYYY-MM" maxLength={7} autoCorrect={false} autoCapitalize="none" accessibilityLabel="Analytics month YYYY-MM" style={[ui.pill, ui.text, { flex: 1, minWidth: 100 }]} />
      <Pressable accessibilityRole="button" style={ui.pill} onPress={() => void store.load(draft)}><Text style={ui.label}>View Month</Text></Pressable></View>
      <PrimaryButton label="Current Household Month" variant="ghost" onPress={() => { store.current(); void store.load(); }} /></View>}
  </View>;
}
export function PriceCoverage({ title, value }: { title: string; value: AnalyticsAmount }) {
  return <View style={a.card}><Text style={a.label}>{title}</Text><Text style={[a.metricValue, { fontSize: 30 }]}>{formatAnalyticsMoney(value.purchaseCostMinor)}</Text>
    <Text style={ui.text}>{value.count} entries · {value.purchaseCount} with recorded purchase prices</Text>
    <Text style={a.caption}>{value.unknownCount} unknown price · excluded from recorded value</Text><AnalyticsDisclosure title={`${title} · estimated values`}><Text style={ui.text}>Estimated: {formatAnalyticsMoney(value.estimatedCostMinor)} ({value.estimatedCount} entries). Estimates are separate from recorded purchase totals.</Text></AnalyticsDisclosure>
  </View>;
}
export function MonthlyChart({ data, wasteOnly = false }: { data: AnalyticsSeries; wasteOnly?: boolean }) {
  const [selected, setSelected] = useState('');
  useEffect(() => { setSelected(''); }, [data]);
  const rows = data.months.map(row => ({ month: row.month, consumed: consumedAmount(row).purchaseCostMinor, wasted: row.wasted.purchaseCostMinor }));
  const max = rows.flatMap(row => wasteOnly ? [row.wasted] : [row.consumed, row.wasted]).reduce((a, b) => BigInt(a) > BigInt(b) ? a : b, '0');
  return <View style={a.card}><Text style={a.heading}>{wasteOnly ? 'Monthly Waste Trend' : 'Monthly Kitchen Activity'}</Text>
    <Text style={ui.text}>Recorded purchase value · {wasteOnly ? 'confirmed waste' : 'consumed vs confirmed waste'}</Text>
    <ScrollView horizontal contentContainerStyle={{ minWidth: '100%', gap: 6, flexDirection: 'row' }} showsHorizontalScrollIndicator>
      {rows.map(row => {
        const description = `${row.month}: consumed ${formatAnalyticsMoney(row.consumed)}, wasted ${formatAnalyticsMoney(row.wasted)}`;
        return <Pressable key={row.month} accessibilityRole="button" accessibilityLabel={description} onPress={() => setSelected(description)} accessibilityState={{ selected: selected === description }} style={{ flex: 1, minWidth: 44, alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 10, backgroundColor: selected === description ? '#E8F5EE' : Colors.surfaceContainerLow }}>
          <View style={{ height: 128, flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
            {(wasteOnly ? [row.wasted] : [row.consumed, row.wasted]).map((amount, index) => <View key={index} style={{ width: wasteOnly ? 32 : 18,
              height: BigInt(amount) === 0n ? 0 : Math.max(2, analyticsBarPercent(amount, max) * 1.25), borderTopLeftRadius: 7, borderTopRightRadius: 7,
              backgroundColor: wasteOnly || index === 1 ? Colors.criticalRose : Colors.primary }} />)}
          </View><Text style={a.label}>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(row.month.slice(5)) - 1]}</Text><Text style={a.caption}>{row.month.slice(0, 4)}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <Text style={ui.label}>{wasteOnly ? '● Waste' : '● Consumed (green) · Waste (rose)'} · Tap a month for exact values</Text>
    <Text style={ui.text} accessibilityLiveRegion="polite">{selected || (max === '0' ? 'No recorded purchase value in this six-month window. Unknown-price entries can still exist.' : 'Amounts are in INR. Estimates and unknown prices are excluded from bars.')}</Text>
  </View>;
}
export function Comparison({ data }: { data: AnalyticsSeries }) {
  return <View style={a.card}><Text style={a.heading}>Compared with {data.previousMonth}</Text>
    <Text style={ui.text}>{data.comparison.period === 'MONTH_TO_DATE' ? 'Month-to-date versus the previous full calendar month.' : data.comparison.period === 'FUTURE_PERIOD' ? 'Future month: comparison is unavailable.' : 'Two complete calendar months.'}</Text>
    {[['Waste value change', data.comparison.wastedPurchaseDeltaMinor], ['Consumed value change', data.comparison.consumedPurchaseDeltaMinor]].map(([label, value]) =>
      <View key={label} style={[a.row, { flexWrap: 'wrap', justifyContent: 'space-between', paddingVertical: 8 }]}><Text style={ui.text}>{label}</Text><Text style={a.heading}>{value === null ? 'Unavailable' : `${BigInt(value!) > 0n ? '+' : ''}${formatAnalyticsMoney(value!)}`}</Text></View>)}
    <Text style={ui.text}>Recorded purchase values only. Estimates and unknown prices are listed separately. Consumed value is not a savings estimate.</Text>
  </View>;
}
