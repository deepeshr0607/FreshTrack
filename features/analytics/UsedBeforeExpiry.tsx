import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ui } from '@/components/PrototypeScreen';
import { Colors } from '@/constants/Theme';
import type { AnalyticsSeries } from '@/types/api';
import { ANALYTICS_CATEGORIES, analyticsCalendarDate, analyticsUsedPrice } from '@/lib/analyticsPresentation';
export default function UsedBeforeExpiry({ data }: { data: AnalyticsSeries }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(false); }, [data.month]);
  const { total, items } = data.usedBeforeExpiry;
  return <View style={ui.card}>
    <View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.heading}>Used On or Before Expiry</Text><Text style={ui.text}>Individual confirmed entries · {data.month}</Text></View>
      {items.length > 3 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} style={ui.pill} onPress={() => setExpanded(!expanded)}><Text style={ui.label}>{expanded ? 'Show Latest 3' : `View Latest ${items.length}`}</Text></Pressable>}</View>
    <Text style={ui.text}>{total} confirmed entries · showing {expanded ? items.length : Math.min(3, items.length)} of the latest {items.length}. Monthly totals include all confirmed uses on/before expiry.</Text>
    {!total && <Text style={ui.text}>No entries were confirmed used on or before their expiry date this month.</Text>}
    {(expanded ? items : items.slice(0, 3)).map(item => {
      const category = ANALYTICS_CATEGORIES.find(row => row.code === item.category)!;
      return <View key={item.eventId} style={{ padding: 12, backgroundColor: Colors.surfaceContainerLow, borderRadius: 12, gap: 8 }}>
        <View style={ui.row}><Text style={{ fontSize: 28 }}>{category.emoji}</Text><View style={{ flex: 1 }}><Text style={ui.heading}>{item.name}</Text>
          <Text style={ui.label}>{analyticsUsedPrice(item)}</Text></View></View>
        <Text style={ui.text}>{category.name} at outcome · Used {analyticsCalendarDate(item.occurredAt, item.outcomeTimezone)} · Expiry {item.expiresOn}</Text>
        {item.reviewable ? <Pressable accessibilityRole="button" accessibilityLabel={`Review Pantry entry ${item.name}`} style={ui.pill}
          onPress={() => router.push({ pathname: '/pantry/[id]', params: { id: item.pantryItemId } })}><Text style={ui.label}>Review Pantry Entry →</Text></Pressable>
          : <Text style={ui.text}>Archived entry · outcome retained in history</Text>}
      </View>;
    })}
    <Text style={[ui.text, { fontSize: 11 }]}>Up to 20 latest confirmed uses. Names are current Pantry names; values, categories and expiry dates were captured at the outcome. Recorded value is not a savings estimate. After-expiry and unconfirmed uses are excluded.</Text>
  </View>;
}
