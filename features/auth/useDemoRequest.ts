import { useEffect, useRef, useState } from 'react';
import { DEMO_AUTH } from '@/lib/auth';

/** One cancellable local delay per screen; no network, credentials or session storage. */
export default function useDemoRequest() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const run = (complete: () => void) => {
    if (timer.current) return;
    setLoading(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setLoading(false);
      complete();
    }, DEMO_AUTH.delayMs);
  };
  return { loading, run };
}
