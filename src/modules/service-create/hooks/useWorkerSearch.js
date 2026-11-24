import { useCallback, useEffect, useState } from 'react';
import { workersService } from '../services/workersService';

const LOADING = { status: 'loading', workers: [], message: '', error: '', fallback: false };

export function useWorkerSearch({ description, neighborhoodId, neighborhood, date, time }) {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    workersService
      .search({ description, neighborhoodId, neighborhood, date, time })
      .then(({ workers, message, fallback }) => {
        if (!cancelled) {
          setState({ status: 'ready', workers, message, error: '', fallback });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ status: 'error', workers: [], message: '', error: e.message, fallback: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [description, neighborhoodId, neighborhood, date, time, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
