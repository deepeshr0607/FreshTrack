import React, { createContext, useContext, useState } from 'react';
import { MOCK_PREFERENCES } from '@/lib/mock';
import { MOCK_PROFILE, type DemoProfile } from '@/lib/auth';
const Context = createContext<{
  profile: DemoProfile; setProfile: (value: DemoProfile) => void;
  rememberDevice: boolean; setRememberDevice: (value: boolean) => void;
  digest: boolean; setDigest: (value: boolean) => void; hour: string; setHour: (value: string) => void;
} | null>(null);
export function MockPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [digest, setDigest] = useState(MOCK_PREFERENCES.digest);
  const [hour, setHour] = useState(MOCK_PREFERENCES.hour);
  return <Context.Provider value={{ profile, setProfile, rememberDevice, setRememberDevice, digest, setDigest, hour, setHour }}>{children}</Context.Provider>;
}
export function useMockPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('MockPreferencesProvider is required.');
  return value;
}
