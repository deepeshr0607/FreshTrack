import { DIAGNOSTICS_ENABLED } from '@/lib/runtimeFeatures';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/Theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.surface },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify-otp" />
      <Stack.Protected guard={DIAGNOSTICS_ENABLED}>
        <Stack.Screen name="native-check" />
        <Stack.Screen name="recover" />
      </Stack.Protected>
    </Stack>
  );
}
