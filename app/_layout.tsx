import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Theme';
import { MockPantryProvider } from '@/context/MockPantryContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MockRecipeProvider } from '@/context/MockRecipeContext';
import { MockPreferencesProvider } from '@/context/MockPreferencesContext';

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
      <MockPantryProvider>
        <MockRecipeProvider>
          <MockPreferencesProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="pantry/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="pantry/add" />
              <Stack.Screen name="recipe/[id]" />
              <Stack.Screen name="recipe/shopping-list" />
              <Stack.Screen name="analytics/financial" />
              <Stack.Screen name="settings/index" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </MockPreferencesProvider>
        </MockRecipeProvider>
      </MockPantryProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
