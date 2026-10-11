import React, { createContext, useContext, useState } from 'react';
import { MOCK_PREFERENCES } from '@/lib/mock';
const Context = createContext<{
  digest: boolean; setDigest: (value: boolean) => void; hour: string; setHour: (value: string) => void;
} | null>(null);
export function MockPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [digest, setDigest] = useState(MOCK_PREFERENCES.digest);
  const [hour, setHour] = useState(MOCK_PREFERENCES.hour);
  return <Context.Provider value={{ digest, setDigest, hour, setHour }}>{children}</Context.Provider>;
}
export function useMockPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('MockPreferencesProvider is required.');
  return value;
}
