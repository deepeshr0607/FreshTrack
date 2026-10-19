/**
 * PrimaryButton.tsx — Pill-shaped primary action button.
 * Height: 52px on mobile. Rich emerald fill, white bold text.
 * Subtle press compression scale effect.
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../constants/Theme';

interface Props {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  icon?: string;
}

export default function PrimaryButton({
  label,
  accessibilityLabel,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  icon,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.white : Colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'ghost' && styles.labelGhost,
          ]}
        >
          {icon ? `${icon}  ` : ''}{label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderWidth: 0,
  },
  ghost: {
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: FontSize.labelLg,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.01,
  },
  labelPrimary: {
    color: Colors.onPrimary,
  },
  labelSecondary: {
    color: Colors.smartAzure,
  },
  labelGhost: {
    color: Colors.onSurface,
  },
});
