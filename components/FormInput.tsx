/**
 * FormInput.tsx — Styled text input matching FreshTrack design system.
 * Surface-tinted, borderless by default, 2px emerald focus ring.
 */
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../constants/Theme';

interface Props extends TextInputProps {
  label: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
}

export default function FormInput({
  label,
  icon,
  rightIcon,
  onRightIconPress,
  error,
  ...inputProps
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {icon ? <Text style={styles.leadIcon}>{icon}</Text> : null}
        <TextInput
          {...inputProps}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={Colors.onSurfaceVariant}
        />
        {rightIcon ? onRightIconPress ? (
          <Pressable onPress={onRightIconPress} accessibilityRole="button"
            accessibilityLabel={`Toggle ${label.toLowerCase()} visibility`}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </Pressable>
        ) : <Text style={styles.rightIcon} accessible={false}>{rightIcon}</Text> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: FontSize.labelLg,
    fontWeight: FontWeight.semibold,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.transparent,
    minHeight: 52,
    gap: Spacing.sm,
  },
  focused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  errorBorder: {
    borderColor: Colors.error,
  },
  leadIcon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: FontSize.bodyLg,
    color: Colors.onSurface,
    fontFamily: 'PlusJakartaSans_400Regular',
    paddingVertical: Spacing.sm,
  },
  rightIcon: {
    fontSize: 20,
    color: Colors.onSurfaceVariant,
    padding: Spacing.xs,
  },
  errorText: {
    fontSize: FontSize.labelSm,
    color: Colors.error,
    marginTop: 4,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
});
