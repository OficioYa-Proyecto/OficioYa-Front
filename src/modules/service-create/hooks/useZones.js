import { useCallback, useEffect, useState } from 'react';
import { zonesService } from '../services/zonesService';

export function useZones() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    zonesService
      .list()
      .then((items) => {
        if (!cancelled) {
          setState({ status: 'ready', items });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', items: [] });
        }
      });
    return () => {
      cancelled = true
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', items: [] });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
