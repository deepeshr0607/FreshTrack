import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { canAccessKitchen } from '@/lib/authSession';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Colors, FontSize, Spacing } from '@/constants/Theme';
import { MockPantryProvider } from '@/context/MockPantryContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MockRecipeProvider } from '@/context/MockRecipeContext';
import { MockPreferencesProvider } from '@/context/MockPreferencesContext';
import { RealPantryProvider } from '@/context/RealPantryContext';
import NotificationResponseBridge from '@/components/NotificationResponseBridge';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Keep SpaceMono for any legacy components
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) throw fontError;
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <AuthProvider><SessionNavigation /></AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SessionLoading() {
  return <View style={navigationStyles.loading} accessibilityRole="progressbar" accessibilityLabel="Checking your saved session">
    <ActivityIndicator color={Colors.primary} size="large" />
    <Text style={navigationStyles.text}>Checking your session…</Text>
  </View>;
}
function SessionNavigation() {
  const { state } = useAuth();
  const started = useRef(false);
  if (!state.checking) started.current = true;
  if (!started.current) return <SessionLoading />;
  const access = canAccessKitchen(state);
  const scope = state.user?.id || (state.demo ? 'demo' : 'anonymous');
  return <View style={{ flex: 1 }}>
    <NotificationResponseBridge />
    <View style={{ flex: 1 }} pointerEvents={state.checking ? 'none' : 'auto'}
      accessibilityElementsHidden={state.checking} importantForAccessibility={state.checking ? 'no-hide-descendants' : 'auto'}>
    <MockPreferencesProvider><MockPantryProvider key={scope}><RealPantryProvider key={scope}><MockRecipeProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!access}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={access}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="pantry/[id]" />
          <Stack.Screen name="pantry/add" />
          <Stack.Screen name="pantry/reconcile" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="recipe/shopping-list" />
          <Stack.Screen name="analytics/financial" />
          <Stack.Screen name="settings/index" />
          <Stack.Screen name="settings/profile" />
          <Stack.Screen name="modal" />
        </Stack.Protected>
        <Stack.Screen name="settings/privacy" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </MockRecipeProvider></RealPantryProvider></MockPantryProvider></MockPreferencesProvider>
    </View>
    {state.checking && <View style={StyleSheet.absoluteFill}><SessionLoading /></View>}
  </View>;
}
const navigationStyles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  text: { color: Colors.onSurfaceVariant, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: FontSize.bodyLg },
});
