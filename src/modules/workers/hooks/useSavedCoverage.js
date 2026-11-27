import { useCallback, useEffect, useState } from 'react';
import { getSavedCoverage } from '../services/workersService';

// Cobertura guardada del trabajador: { zoneIds (sueltos), localityIds }. reload() la vuelve a pedir.
export function useSavedCoverage(workerId) {
  const [state, setState] = useState({ data: null, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!workerId) return undefined;
    let active = true;
    getSavedCoverage(workerId)
      .then((data) => active && setState({ data, error: null }))
      .catch((error) => active && setState({ data: null, error: error.message }));
    return () => {
      active = false;
    };
  }, [workerId, version]);
  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return { ...state, reload };
}