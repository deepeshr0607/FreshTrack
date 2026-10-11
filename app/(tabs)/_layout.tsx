/**
 * Tab layout — four-tab authenticated app.
 * Design reference: All tab screen designs show a floating bottom navigation dock
 * with: Home, Pantry, [Scanner FAB center], Recipes, Insights
 *
 * Using Expo Router Tabs with custom tabBar for the floating pill design.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Elevation, FontSize, FontWeight, Radius, Spacing } from '@/constants/Theme';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

const TAB_ICONS: Record<string, { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string }> = {
  index: { icon: 'home-outline', label: 'Home' },
  pantry: { icon: 'fridge-outline', label: 'Pantry' },
  scanner: { icon: 'barcode-scan', label: 'Scan' },
  recipes: { icon: 'silverware-fork-knife', label: 'Recipes' },
  insights: { icon: 'chart-bar', label: 'Insights' },
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.tabBar}>
        {(state.routes as Array<{ key: string; name: string }>).filter((route) => route.name !== 'two').map((route) => {
          const { options } = descriptors[route.key]!;
          const isFocused = state.routes[state.index]?.key === route.key;
          const isScanner = route.name === 'scanner';
          const tabInfo = TAB_ICONS[route.name] ?? { icon: 'circle-outline' as const, label: route.name };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isScanner) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.fabWrapper}
                accessibilityRole="button"
                accessibilityLabel="Scanner"
                accessibilityState={{ selected: isFocused }}
              >
                <View style={[styles.fab, isFocused && styles.fabActive]}>
                  <MaterialCommunityIcons name="barcode-scan" color={Colors.white} size={28} />
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityLabel={options.title ?? tabInfo.label}
              accessibilityState={{ selected: isFocused }}
            >
              <MaterialCommunityIcons name={tabInfo.icon} size={24} color={isFocused ? Colors.primary : Colors.onSurfaceVariant} />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tabInfo.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="pantry" options={{ title: 'Pantry' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Scanner' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
  },
  tabBar: {
    width: '100%',
    maxWidth: 410,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...Elevation.floatingNav,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: FontSize.labelSm,
    color: Colors.onSurfaceVariant,
    fontFamily: 'PlusJakartaSans_400Regular',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  fabActive: {
    backgroundColor: Colors.freshGreen,
  },
  fabIcon: {
    fontSize: 24,
    color: Colors.onPrimary,
  },
});
