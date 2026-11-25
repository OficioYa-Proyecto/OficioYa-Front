import { useCallback, useEffect, useState } from 'react';
import { tradesService } from '../services/tradesService';

export function useTrades() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    tradesService
      .list()
      .then((items) => !cancelled && setState({ status: 'ready', items }))
      .catch(() => !cancelled && setState({ status: 'error', items: [] }));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', items: [] });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
