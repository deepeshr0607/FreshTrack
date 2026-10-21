import { useCallback, useEffect, useRef, useState } from 'react';
import { NeonAuthError } from '@/lib/neonAuth';

/** Guard repeated submits and UI updates after a route has unmounted. */
export default function useAuthRequest(onError: (message: string) => void) {
  const busy = useRef(false);
  const mounted = useRef(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (action: (isMounted: () => boolean) => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try { await action(() => mounted.current); }
    catch (error) {
      if (mounted.current) onError(error instanceof NeonAuthError
        ? `${error.message}${/^[A-Z_0-9]{1,40}$/.test(error.code) ? ` (${error.code})` : ''}`
        : 'Unable to access secure authentication. Please retry.');
    } finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, [onError]);
  return { loading, run };
}
