import { useCallback, useEffect, useMemo, useState } from 'react';
import { workersService } from '../services/workersService';

const LOADING = { status: 'loading', workers: [], message: '', error: '' };

export function useWorkerSearch({ tradeId, zoneIds, date, time }) {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);
  const zoneIdsKey = JSON.stringify(zoneIds ?? []);
  const searchZoneIds = useMemo(() => JSON.parse(zoneIdsKey), [zoneIdsKey]);

  useEffect(() => {
    let cancelled = false;
    workersService
      .search({ tradeId, zoneIds: searchZoneIds, date, time })
      .then(({ workers, message }) => {
        if (!cancelled) {
          setState({ status: 'ready', workers, message, error: '' });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setState({ status: 'error', workers: [], message: '', error: e.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tradeId, searchZoneIds, date, time, attempt]);

  const retry = useCallback(() => {
    setState(LOADING);
    setAttempt((n) => n + 1);
  }, []);

  return { ...state, retry };
}
