import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import PrototypeScreen, { ui } from '@/components/PrototypeScreen';
import PrimaryButton from '@/components/PrimaryButton';
import PantryConfirmation from '@/components/PantryConfirmation';
import ReportSheet from '@/components/ReportSheet';
import { MOCK_ANALYTICS_SUMMARY, MOCK_WASTE_EVENTS, type PantryItem } from '@/lib/mock';
import { sessionOutcomes } from '@/lib/analytics';
import { useMockPantry } from '@/context/MockPantryContext';
import { Colors } from '@/constants/Theme';
import { useRealPantry } from '@/context/RealPantryContext';
import ReconciliationBanner from '@/components/ReconciliationBanner';

export default function FinancialAnalytics() {
  const real = useRealPantry();
  const [month, setMonth] = useState('2025-06');
  const [chooseMonth, setChooseMonth] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [confirm, setConfirm] = useState<{ item: PantryItem; status: 'CONSUMED' | 'WASTED' } | null>(null);
  const { items, dispatch } = useMockPantry();
  const outcomes = sessionOutcomes(items);
  const data = MOCK_WASTE_EVENTS.find((entry) => entry.month === month)!;
  const summary = MOCK_ANALYTICS_SUMMARY;
  const saved = data.savedCost / 100 + (month === '2025-06' ? outcomes.saved : 0);
  const lost = data.wastedCost / 100 + (month === '2025-06' ? outcomes.wasted : 0);
  const overdue = items.filter((item) => item.status === 'ACTIVE' && item.daysLeft < 0);
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const showReport = () => setReport(`FreshTrack — ${monthLabel} financial sample\nMoney saved: $${saved.toFixed(2)}\nFood wasted: $${lost.toFixed(2)}\nPrototype snapshot; not a real household audit.`);
  return <PrototypeScreen back={() => router.dismissTo('/(tabs)/insights')}>
    <View style={ui.row}><Text style={[ui.title, { flex: 1 }]}>Impact &amp; Financial Analytics</Text>
      <Pressable onPress={() => setChooseMonth(!chooseMonth)} accessibilityRole="button" accessibilityLabel="Choose analytics month" style={ui.pill}>
        <Text style={ui.label}>{monthLabel} ⌄</Text></Pressable></View>
    {chooseMonth && <View style={ui.card}>{MOCK_WASTE_EVENTS.map((entry) => <Pressable key={entry.month} style={ui.pill}
      onPress={() => { setMonth(entry.month); setChooseMonth(false); }} accessibilityRole="button"><Text style={ui.label}>{entry.month}</Text></Pressable>)}</View>}
    <Text style={ui.text}>Sample pantry efficiency overview. Achievement, score and carbon panels show the supplied June audit.</Text>
    <View style={[ui.card, { backgroundColor: Colors.primary }]}><Text style={[ui.label, { color: Colors.inversePrimary }]}>ACHIEVEMENT ♜</Text>
      <Text style={[ui.heading, { color: Colors.white }]}>Zero-Waste Master Lvl 2</Text><Text style={[ui.text, { color: Colors.white }]}>In the top 4% of smart eco-kitchens in June</Text></View>
    <View style={ui.card}><Text style={ui.heading}>♧ Waste Prevention Score</Text><Text style={ui.large}>{summary.wastePrevScore} <Text style={ui.text}>/ 100</Text></Text>
      <View style={{ backgroundColor: Colors.surfaceContainerHigh, height: 8, borderRadius: 8 }}><View style={{ backgroundColor: Colors.primary, height: 8, borderRadius: 8, width: `${summary.wastePrevScore}%` }} /></View></View>
    {[{ title: 'Money Saved', value: `$${saved.toFixed(2)}`, color: Colors.primary, note: month === '2025-06' ? '+24% vs last mo (sample)' : 'Selected month sample' },
      { title: 'Food Wasted', value: `$${lost.toFixed(2)}`, color: Colors.criticalRose, note: month === '2025-06' ? 'Down from $38.00 (sample)' : 'Selected month sample' },
      { title: 'CO₂ Prevented', value: `${summary.co2Prevented} kg`, color: Colors.onSurface, note: `${summary.milesEquivalent} miles driven` }].map((metric) =>
      <View style={[ui.card, ui.row]} key={metric.title}><View><Text style={ui.text}>{metric.title}</Text><Text style={[ui.large, { color: metric.color }]}>{metric.value}</Text></View>
        <Text style={[ui.label, { flexShrink: 1 }]}>{metric.note}</Text></View>)}
    <View style={ui.card}><Text style={ui.heading}>Monthly Waste Trend</Text><Text style={ui.text}>Consecutive weekly dollar losses</Text>
      <View style={{ flexDirection: 'row', gap: 8, height: 160 }}>
        {summary.weeklyWaste.map((entry, index) => <Pressable key={entry.week} accessibilityRole="button"
          accessibilityLabel={`${entry.week} waste $${(entry.amount / 100).toFixed(2)}`} onPress={() => setSelectedWeek(`${entry.week}: $${(entry.amount / 100).toFixed(2)} lost`)}
          style={{ flex: 1, alignItems: 'center', gap: 6 }}><Text style={ui.label}>${entry.amount / 100}</Text>
          <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%', backgroundColor: Colors.surfaceContainerLow, borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
            <View style={{ height: `${entry.amount / 1800 * 100}%`, backgroundColor: [Colors.criticalRose, '#F59E0B', Colors.inversePrimary, Colors.primary][index], borderTopLeftRadius: 8, borderTopRightRadius: 8 }} /></View>
          <Text style={ui.text}>{entry.week}</Text></Pressable>)}
      </View><Text style={ui.label}>{selectedWeek || '✓ Down 88.8% from Week 1 peak!   Target: <$1/wk'}</Text>
      <Text style={[ui.text, { fontSize: 11 }]}>Weekly chart is the supplied June design sample.</Text></View>
    <View style={ui.card}><Text style={ui.heading}>Category Breakdown</Text><Text style={ui.text}>Where the June $12.40 occurred</Text>
      <View style={{ flexDirection: 'row', height: 12, borderRadius: 8, overflow: 'hidden' }}>{summary.categoryBreakdown.map((entry) =>
        <View key={entry.category} style={{ width: `${entry.percent}%`, backgroundColor: entry.color }} />)}</View>
      {summary.categoryBreakdown.map((entry) => <View key={entry.category} style={ui.row}><Text style={[ui.text, { flex: 1 }]}>● {entry.category}</Text>
        <Text style={ui.text}>${(entry.amount / 100).toFixed(2)}   {entry.percent}%</Text></View>)}</View>
    <View style={ui.card}><Text style={ui.heading}>Hero Rescues — June Sample</Text><Text style={ui.text}>Smart culinary decisions that paid off</Text>
      {summary.heroRescues.map((entry) => <View key={entry.id} style={ui.row}><Text style={{ fontSize: 32 }}>{entry.imageEmoji}</Text>
        <View style={{ flex: 1 }}><Text style={ui.text}>{entry.name}</Text><Text style={ui.text}>{entry.note}</Text></View><Text style={ui.label}>+${entry.saved.toFixed(2)}</Text></View>)}
      <PrimaryButton label="Download Full Monthly Eco-Statement" variant="ghost" onPress={showReport} /></View>
    {real.enabled ? <ReconciliationBanner /> : <View style={ui.card}><Text style={ui.heading}>Inventory Reconciliation</Text>
      {overdue.length ? <><Text style={ui.text}>{overdue.length} expired entries need a confirmed outcome.</Text>
        {overdue.map((item) => <View key={item.id} style={{ gap: 8 }}><Text style={ui.text}>{item.name}</Text>
          <View style={ui.row}>{(['CONSUMED', 'WASTED'] as const).map((status) => <Pressable key={status} style={ui.pill}
            onPress={() => setConfirm({ item, status })} accessibilityRole="button"><Text style={ui.label}>{status === 'CONSUMED' ? 'Used' : 'Wasted'}</Text></Pressable>)}</View></View>)}</> :
        <Text style={ui.text}>No expired entries are waiting for reconciliation.</Text>}
    </View>}
    <PantryConfirmation item={confirm?.item ?? null} action={confirm?.status ?? 'CONSUMED'} onCancel={() => setConfirm(null)} onConfirm={() => {
      if (!confirm) return; dispatch({ type: 'status', id: confirm.item.id, status: confirm.status }); setConfirm(null);
    }} />
    <ReportSheet report={report} onClose={() => setReport(null)} />
  </PrototypeScreen>;
}
