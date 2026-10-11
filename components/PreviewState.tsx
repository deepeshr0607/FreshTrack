import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import PrimaryButton from './PrimaryButton';
import { ui } from './PrototypeScreen';
import { Colors } from '@/constants/Theme';

/** Query-addressable prototype failures keep test controls out of the product UI. */
export function usePreviewState() {
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(preview === 'error' ? 'error' : 'loading');
  const [empty, setEmpty] = useState(preview === 'empty');
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('ready'), 350);
    return () => clearTimeout(timer);
  }, [status]);
  return { status, retry: () => { setEmpty(false); setStatus('loading'); }, empty };
}

export default function PreviewState({ status, retry }: { status: 'loading' | 'error'; retry: () => void }) {
  return <View style={ui.card}>{status === 'loading' ? <>
    <ActivityIndicator color={Colors.primary} accessibilityLabel="Loading suggestions" />
    <Text style={ui.text}>Preparing your kitchen overview…</Text>
  </> : <><Text style={ui.heading}>Could not load this overview</Text>
    <Text style={ui.text}>Try again to reload the sample data.</Text><PrimaryButton label="Try Again" onPress={retry} /></>}</View>;
}
