import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ui } from '@/components/PrototypeScreen';
import { a, AnalyticsDisclosure } from './AnalyticsPresentation';
import { Colors } from '@/constants/Theme';
import type { AnalyticsSeries } from '@/types/api';
import { ANALYTICS_CATEGORIES, analyticsCategoryShares, consumedAmount, formatAnalyticsMoney } from '@/lib/analyticsPresentation';
const palette = [Colors.primary, Colors.secondaryContainer, Colors.criticalRose, Colors.smartAzure, Colors.primaryContainer, Colors.tertiary, Colors.outline];
export default function CategoryBreakdown({ data, waste = false }: { data: AnalyticsSeries; waste?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [data.month]);
  const rows = data.categories.map(category => ({ ...ANALYTICS_CATEGORIES.find(row => row.code === category.category)!, color: palette[ANALYTICS_CATEGORIES.findIndex(row => row.code === category.category)], value: waste ? category.wasted : consumedAmount(category) }))
    .sort((a, b) => BigInt(a.value.purchaseCostMinor) === BigInt(b.value.purchaseCostMinor) ? b.value.count - a.value.count || a.code.localeCompare(b.code) : BigInt(a.value.purchaseCostMinor) > BigInt(b.value.purchaseCostMinor) ? -1 : 1);
  const shares = analyticsCategoryShares(rows.map(row => row.value.purchaseCostMinor));
  const total = String(rows.reduce((sum, row) => sum + BigInt(row.value.purchaseCostMinor), 0n));
  return <View style={a.card}>
    <View style={[ui.row, { flexWrap: 'wrap' }]}><View style={{ flex: 1 }}><Text style={ui.heading}>{waste ? 'Category Breakdown · Waste' : 'Consumed by Category'}</Text>
      <Text style={a.caption}>Recorded purchase value</Text></View>
      {!waste && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} style={ui.pill} onPress={() => setExpanded(!expanded)}><Text style={ui.label}>{expanded ? 'Show Top 4' : 'View All (7)'}</Text></Pressable>}
    </View>
    <Text style={ui.label}>Total: {formatAnalyticsMoney(total)}</Text>
    {total !== '0' ? <View style={{ flexDirection: 'row', height: 12, borderRadius: 8, overflow: 'hidden' }}>
      {rows.map((row, index) => <View key={row.code} accessible accessibilityLabel={`${row.name}: ${((shares[index] ?? 0) / 10).toFixed(1)} percent of recorded purchase value`} style={{ width: `${(shares[index] ?? 0) / 10}%`, backgroundColor: row.color }} />)}
    </View> : <Text style={ui.text}>No recorded purchase value to divide into shares.</Text>}
    {(waste || expanded ? rows : rows.slice(0, 4)).map((row, index) => <View key={row.code} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.surfaceContainerLow, gap: 4 }}>
      <View style={ui.row}><Text style={{ fontSize: 24 }}>{row.emoji}</Text><View style={{ flex: 1 }}><Text style={a.heading}>{row.name}</Text>
        <Text style={ui.label}>{formatAnalyticsMoney(row.value.purchaseCostMinor)} · {shares[index] === null ? 'Share unavailable' : `${(shares[index]! / 10).toFixed(1)}% of priced ${waste ? 'waste' : 'consumed value'}`}</Text></View></View>
      <Text style={a.caption}>{row.value.count} entries · {row.value.unknownCount} unknown price</Text>
    </View>)}
    <AnalyticsDisclosure title="Category price details">{rows.map(row => <Text key={row.code} style={a.caption}>{row.name}: {row.value.purchaseCount} purchase-priced · Estimated {formatAnalyticsMoney(row.value.estimatedCostMinor)} ({row.value.estimatedCount} entries)</Text>)}</AnalyticsDisclosure>
    <Text style={[ui.text, { fontSize: 11 }]}>Outcome-time categories. Shares exclude estimates and unknown prices; rounded shares total 100.0% when recorded purchase value exists.</Text>
  </View>;
}
