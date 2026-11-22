import { useCallback, useEffect, useState } from 'react';
import { requestsService } from '../services/requestsService';

// Carga las solicitudes del usuario según su rol y expone las acciones sobre ellas.
// role: 'TRABAJADOR' | 'CONTRATANTE'
// action: 'accept' | 'reject' | 'complete' | 'acceptConflict' | 'cancel' | 'remove'
export function useRequests(role) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    requestsService
      .listMine(role)
      .then((data) => {
        if (!cancelled) {
          setRequests(Array.isArray(data) ? data : []);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [role, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const act = useCallback(
    async (action, id) => {
      setError('');
      try {
        await requestsService[action](id);
        reload();
      } catch (e) {
        setError(e.message);
      }
    },
    [reload],
  );

  return { requests, loading, error, reload, act };
}
