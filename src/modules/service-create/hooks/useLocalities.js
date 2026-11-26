import { useCallback, useEffect, useState } from 'react';
import { localitiesService } from '../services/localitiesService';

export function useLocalities() {
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    localitiesService
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
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading', items: [] });
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
