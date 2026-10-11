import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrototypeScreen, { Choice, ui } from '@/components/PrototypeScreen';
import ScreenHeader from '@/components/ScreenHeader';
import PrimaryButton from '@/components/PrimaryButton';
import ComparisonChart from '@/components/ComparisonChart';
import ReportSheet from '@/components/ReportSheet';
import PreviewState, { usePreviewState } from '@/components/PreviewState';
import { MOCK_EFFICIENCY, MOCK_HABIT_RECOMMENDATION, MOCK_INSIGHT_PERIODS, MOCK_KITCHEN_BADGES,
  MOCK_SAVED_CATEGORIES, type InsightPeriod } from '@/lib/mock';
import { impactReport, sessionOutcomes } from '@/lib/analytics';
import { useMockPantry } from '@/context/MockPantryContext';
import { Colors, Radius } from '@/constants/Theme';

export default function InsightsScreen() {
  const [period, setPeriod] = useState<InsightPeriod>('This Month');
  const [report, setReport] = useState<string | null>(null);
  const [week, setWeek] = useState<string | null>(null);
  const [categories, setCategories] = useState(false);
  const { items } = useMockPantry();
  const load = usePreviewState();
  const sample = MOCK_INSIGHT_PERIODS[period];
  const outcomes = sessionOutcomes(items);
  const saved = sample.saved + outcomes.saved;
  const chart = period === 'Weekly' ? MOCK_EFFICIENCY.slice(-1) : MOCK_EFFICIENCY.map((entry) => ({
    ...entry, rescued: entry.rescued * sample.rescuedKg / 19.2, wasted: entry.wasted * sample.wasteKg / 1.6,
  }));
  const selectedWeek = chart.find((entry) => entry.label === week);
  const showReport = () => setReport(impactReport(period, saved, sample.co2Kg, sample.rescuedKg));
  const categoryRows = MOCK_SAVED_CATEGORIES.map((entry, index) => <View key={entry.name}
    style={[ui.row, { backgroundColor: Colors.surface, padding: 8, borderRadius: Radius.md }]}>
    <MaterialCommunityIcons name={entry.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
      size={24} color={Colors.primary} style={{ padding: 8, backgroundColor: index % 2 ? Colors.surfaceContainerHigh : Colors.freshGreenBg, borderRadius: 8 }} />
    <View style={{ flex: 1 }}><Text style={ui.text}>{entry.name}</Text>
      <Text style={ui.text}>{entry.kg.toFixed(1)} kg rescued · <Text style={ui.label}>${entry.value.toFixed(2)}</Text></Text></View>
    <View><Text style={[ui.label, { backgroundColor: Colors.inversePrimary, paddingHorizontal: 6, borderRadius: 8 }]}>{entry.rate}%</Text>
      <Text style={[ui.text, { fontSize: 10 }]}>rescue rate</Text></View>
  </View>);
  return <PrototypeScreen header={<ScreenHeader title="FreshTrack" subtitle="Analytics" />}>
    <View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.label}>MONTHLY AUDIT</Text>
      <Text style={ui.title}>Insights &amp; Impact</Text></View>
      <Pressable onPress={showReport} accessibilityRole="button" accessibilityLabel="Share impact summary" style={ui.pill}><Text style={ui.label}>↥</Text></Pressable>
      <Pressable onPress={showReport} accessibilityRole="button" accessibilityLabel="Download monthly report" style={ui.pill}><Text style={ui.label}>↓</Text></Pressable></View>
    <View style={ui.tabs}>{(Object.keys(MOCK_INSIGHT_PERIODS) as InsightPeriod[]).map((value) =>
      <Choice key={value} label={value} selected={period === value} onPress={() => { setPeriod(value); setWeek(null); }} />)}</View>
    {load.status !== 'ready' ? <PreviewState status={load.status} retry={load.retry} /> : load.empty ?
      <View style={ui.card}><Text style={ui.heading}>No impact recorded yet</Text><PrimaryButton label="View Pantry" onPress={() => router.push('/(tabs)/pantry')} /></View> : <>
      <View style={[ui.card, { backgroundColor: Colors.primary }]}>
        <View style={ui.row}><Text style={[ui.label, { color: Colors.inversePrimary }]}>♧ TOTAL RESCUED VALUE</Text>
          <Text style={[ui.label, { color: Colors.white }]}>{sample.growth}</Text></View>
        <Text style={[ui.large, { color: Colors.white }]}>${saved.toFixed(2)} <Text style={[ui.text, { color: Colors.inversePrimary }]}>saved</Text></Text>
        <Text style={[ui.text, { color: Colors.white }]}>Equivalent to <Text style={{ fontFamily: 'PlusJakartaSans_700Bold' }}>{sample.meals} complete meals</Text> kept out of landfills.</Text>
        <View style={ui.row}>{[{ value: sample.rescuedKg, label: 'Fresh produce & goods', badge: period === 'This Month' ? '-85% waste' : 'Sample rescue mass' },
          { value: sample.co2Kg, label: 'CO₂e diverted', badge: `${Math.round(sample.co2Kg * 175 / 42.8)} mi eq.` }].map((entry) =>
          <View key={entry.label} style={{ flex: 1, padding: 8, gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 }}>
            <Text style={[ui.label, { color: Colors.inversePrimary }]}>{entry.badge}</Text>
            <Text style={[ui.large, { fontSize: 24, color: Colors.white }]}>{entry.value.toFixed(1)} kg</Text>
            <Text style={[ui.label, { color: Colors.inversePrimary, fontSize: 11 }]}>{entry.label}</Text></View>)}</View>
      </View>
      <View style={ui.card}><View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.heading}>Weekly Efficiency</Text>
        <Text style={ui.text}>Consumed items vs avoidable spoilage</Text></View><Text style={ui.label}>{sample.wasteFree}% Waste-Free</Text></View>
        <ComparisonChart data={chart} onSelect={setWeek} />
        <Text style={[ui.label, { fontSize: 11 }]}>● Rescued ({sample.rescuedKg} kg)   ● Waste ({sample.wasteKg} kg)   +8% vs avg</Text>
        {selectedWeek && <Text accessibilityLiveRegion="polite" style={ui.text}>{selectedWeek.label}: {selectedWeek.rescued.toFixed(1)} kg rescued · {selectedWeek.wasted.toFixed(1)} kg wasted</Text>}
      </View>
      <View style={[ui.card, { backgroundColor: Colors.surfaceContainerHigh }]}>
        <View style={ui.row}><MaterialCommunityIcons name="trophy-outline" size={28} color={Colors.secondary} />
          <View style={{ flex: 1 }}><Text style={ui.heading}>Kitchen Hero <Text style={ui.label}>Lvl 3</Text></Text>
            <Text style={ui.text}>{Math.max(0, sample.goal - sample.rescues)} more rescued meals until Master Chef Tier</Text></View></View>
        <View style={ui.row}><Text style={ui.label}>Level Progress</Text><Text style={ui.label}>{sample.rescues} / {sample.goal} Rescues</Text></View>
        <View style={{ height: 6, backgroundColor: Colors.white, borderRadius: 6 }}><View style={{ height: 6,
          width: `${sample.rescues / sample.goal * 100}%`, backgroundColor: Colors.primary, borderRadius: 6 }} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{MOCK_KITCHEN_BADGES.map((badge) =>
          <View key={badge} style={[ui.pill, { backgroundColor: Colors.white }]}><Text style={ui.label}>♧ {badge}</Text></View>)}</ScrollView>
      </View>
      <View style={ui.card}><View style={ui.row}><View style={{ flex: 1 }}><Text style={ui.heading}>Saved by Category</Text>
        <Text style={ui.text}>June sample across food departments</Text></View><Pressable onPress={() => setCategories(true)} accessibilityRole="button"><Text style={ui.label}>View All</Text></Pressable></View>
        {categoryRows}</View>
      <View style={[ui.card, { borderLeftWidth: 5, borderLeftColor: Colors.primary }]}>
        <Text style={ui.heading}>✦ AI Kitchen Habit Recommendation</Text><Text style={ui.text}>{MOCK_HABIT_RECOMMENDATION}</Text>
        <View style={{ gap: 8 }}><PrimaryButton label="Plan Rescue Meals" onPress={() => router.push('/(tabs)/recipes')} />
          <PrimaryButton label="Adjust Reminder Window" variant="ghost" onPress={() => router.push('/settings')} /></View>
      </View>
      <PrimaryButton label="Impact & Financial Analytics →" variant="ghost" onPress={() => router.push('/analytics/financial')} />
      {!!(outcomes.usedItems + outcomes.wastedItems) && <Text style={ui.text}>This demo session: {outcomes.usedItems} used · {outcomes.wastedItems} wasted (${outcomes.wasted.toFixed(2)}).</Text>}
      <Text style={[ui.text, { fontSize: 11 }]}>Sample audit. Food mass and carbon figures are illustrative; inventory actions update session value only.</Text>
    </>}
    <ReportSheet report={report} onClose={() => setReport(null)} />
    <Modal visible={categories} transparent onRequestClose={() => setCategories(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(19,27,46,0.4)', justifyContent: 'center', padding: 16 }}>
        <ScrollView contentContainerStyle={ui.card} style={{ maxHeight: '80%' }}><Text style={ui.title}>Saved by Category — Month Sample</Text>{categoryRows}
          <PrimaryButton label="Close" onPress={() => setCategories(false)} /></ScrollView></View>
    </Modal>
  </PrototypeScreen>;
}
