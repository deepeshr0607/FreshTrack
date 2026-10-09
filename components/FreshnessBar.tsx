/**
 * FreshnessBar.tsx — Slim horizontal progress bar showing freshness.
 * 4px height per design system spec. Color transitions green → amber → red.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getFreshnessProgress, getFreshnessStyle } from '../lib/expiry';
import { Radius } from '../constants/Theme';

interface Props {
  daysLeft: number;
  totalDays?: number;
}

export default function FreshnessBar({ daysLeft, totalDays = 14 }: Props) {
  const progress = getFreshnessProgress(daysLeft, totalDays);
  const { barColor } = getFreshnessStyle(daysLeft);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
