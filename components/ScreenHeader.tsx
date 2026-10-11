/**
 * ScreenHeader.tsx — Consistent app header with FreshTrack branding.
 * Used across tabs. Matches design-reference headers.
 */
import React from 'react';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { avatarImage, brandImage } from '@/lib/designAssets';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/Theme';

interface Props {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
  showAvatar?: boolean;
  onNotificationPress?: () => void;
  onAvatarPress?: () => void;
}

export default function ScreenHeader({
  title,
  subtitle,
  showNotification = true,
  showAvatar = true,
  onNotificationPress,
  onAvatarPress,
}: Props) {
  return (
    <View style={styles.container}>
      {/* Brand */}
      <View style={styles.brand}>
        <Image source={brandImage} style={{ width: 36, height: 36, borderRadius: 8 }} />
        <View>
          <Text style={styles.appName}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {/* Right actions */}
      <View style={styles.actions}>
        {showNotification && (
          <Pressable
            onPress={onNotificationPress ?? (() => router.push('/settings'))}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.onSurface} />
            <View style={styles.notifDot} />
          </Pressable>
        )}
        {showAvatar && (
          <Pressable
            onPress={onAvatarPress ?? (() => router.push('/settings'))}
            style={styles.avatar}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <Image source={avatarImage} style={{ width: 36, height: 36, borderRadius: 18 }} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  logo: {
    fontSize: 22,
  },
  appName: {
    fontSize: FontSize.headlineSm,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.onSurface,
  },
  subtitle: {
    fontSize: FontSize.labelMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  icon: {
    fontSize: 20,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.criticalRose,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.labelLg,
    fontWeight: FontWeight.bold,
    color: Colors.onPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
