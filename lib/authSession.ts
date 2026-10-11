import type { AuthIdentity } from './neonAuth';

export interface AuthSessionState {
  status: 'anonymous' | 'authenticated' | 'error';
  user: AuthIdentity | null;
  demo: boolean;
  checking: boolean;
  error: string;
}
export const anonymousSession: AuthSessionState = { status: 'anonymous', user: null, demo: false, checking: false, error: '' };
export const canAccessKitchen = (state: AuthSessionState) => state.status === 'authenticated' || state.demo;
interface SessionClient { getSession(): Promise<AuthIdentity | null>; signOut(): Promise<void> }

/** Serializes provider operations; late restoration cannot resurrect a signed-out/demo session. */
export function createAuthSession(client: SessionClient | null, allowDemo: boolean) {
  let state: AuthSessionState = { ...anonymousSession, checking: !!client };
  const initial = state;
  let revision = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (value: AuthSessionState) => { state = value; listeners.forEach((listener) => listener()); };
  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
  };
  const failure = (id: number) => {
    if (id === revision) publish({ ...anonymousSession, status: 'error', error: 'Unable to verify your session. Check your connection and retry.' });
  };
  return {
    getSnapshot: () => state,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh(): Promise<AuthIdentity | null> {
      if (state.demo) return null;
      const id = ++revision;
      publish({ ...state, checking: true, error: '' });
      return enqueue(async () => {
        try {
          const user = client ? await client.getSession() : null;
          if (id === revision) publish(user ? { ...anonymousSession, status: 'authenticated', user } : { ...anonymousSession });
          return id === revision ? user : null;
        } catch (error) { failure(id); throw error; }
      });
    },
    async authenticate(action: () => Promise<AuthIdentity | null>): Promise<AuthIdentity | null> {
      const id = ++revision;
      publish({ ...state, checking: true, error: '' });
      return enqueue(async () => {
        try {
          if (!client) throw new Error('Native authentication is unavailable.');
          const candidate = await action();
          const user = candidate ? await client.getSession() : null;
          if (candidate && (!user || user.id !== candidate.id || user.email.toLowerCase() !== candidate.email.toLowerCase())) {
            throw new Error('The accepted authentication could not be verified. Retry checking the saved session.');
          }
          if (id === revision) publish(user ? { ...anonymousSession, status: 'authenticated', user } : { ...anonymousSession });
          return id === revision ? user : null;
        } catch (error) { failure(id); throw error; }
      });
    },
    async signOut() {
      const id = ++revision;
      const previous = state;
      publish({ ...state, checking: true, error: '' });
      return enqueue(async () => {
        try {
          if (client && !previous.demo) await client.signOut();
          if (id === revision) publish({ ...anonymousSession });
        } catch (error) {
          if (id === revision) publish({ ...previous, checking: false, error: 'Sign-out failed. Retry to revoke your session.' });
          throw error;
        }
      });
    },
    enterDemo() {
      if (!allowDemo || state.checking || state.status === 'authenticated') return false;
      revision++;
      publish({ ...anonymousSession, demo: true });
      return true;
    },
    exitDemo() { revision++; publish({ ...anonymousSession }); },
  };
}
