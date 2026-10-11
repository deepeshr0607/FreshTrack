import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Colors } from '@/constants/Theme';
import { ui } from './PrototypeScreen';

export default function ComparisonChart({ data, onSelect, colors = [Colors.primary, '#ffb2b7'] }: {
  data: { label: string; rescued: number; wasted: number }[];
  onSelect: (label: string) => void; colors?: string[];
}) {
  const max = Math.max(...data.flatMap((entry) => [entry.rescued, entry.wasted]), 1);
  return <View style={{ flexDirection: 'row', gap: 12, height: 150, alignItems: 'flex-end' }}>
    {data.map((entry) => <Pressable key={entry.label} accessibilityRole="button"
      accessibilityLabel={`${entry.label}: rescued ${entry.rescued.toFixed(1)}, wasted ${entry.wasted.toFixed(1)}`}
      onPress={() => onSelect(entry.label)} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6, height: 120, alignItems: 'flex-end' }}>
        {[entry.rescued, entry.wasted].map((value, index) => <View key={index} style={{ width: 14,
          height: Math.max(4, value / max * 118), backgroundColor: colors[index], borderTopLeftRadius: 7, borderTopRightRadius: 7 }} />)}
      </View><Text style={ui.label}>{entry.label}</Text>
    </Pressable>)}
  </View>;
}
