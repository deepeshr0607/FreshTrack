import type { AuthStorage } from './neonAuth';

/** Provider cookies only. Unremembered sessions and rotations must never reach disk. */
export function createNativeSessionStorage(secure: AuthStorage): AuthStorage {
  let memoryCookie: string | null = null;
  let persistentSession = true;
  return {
    get: async () => memoryCookie ?? secure.get(),
    set: async (cookie, persist = persistentSession) => {
      if (persist) await secure.set(cookie);
      else await secure.clear();
      persistentSession = persist;
      memoryCookie = cookie;
    },
    clear: async () => { await secure.clear(); memoryCookie = null; persistentSession = true; },
  };
}
