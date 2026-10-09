/**
 * ExpiryBadge.tsx — Pill badge showing freshness status.
 * Colors follow design-reference/freshtrack_design_system/DESIGN.md.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getFreshnessStyle } from '../lib/expiry';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/Theme';

interface Props {
  daysLeft: number;
  expirySource?: 'PACKAGE_DATE' | 'PRESET_ESTIMATE' | 'USER_ENTERED';
  compact?: boolean;
}

export default function ExpiryBadge({ daysLeft, expirySource, compact = false }: Props) {
  const style = getFreshnessStyle(daysLeft);
  const isEstimate = expirySource === 'PRESET_ESTIMATE';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: style.badgeBg },
        isEstimate && styles.estimateBorder,
        compact && styles.compact,
      ]}
    >
      <Text style={[styles.text, { color: style.badgeText }, compact && styles.compactText]}>
        {isEstimate ? '✦ ' : ''}
        {style.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  estimateBorder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(14,165,233,0.4)',
  },
  text: {
    fontSize: FontSize.labelMd,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  compact: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  compactText: {
    fontSize: FontSize.labelSm,
  },
});
