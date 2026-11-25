import { useCallback, useEffect, useState } from 'react';
import { requestsService } from '../services/requestsService';

// Carga las solicitudes del usuario según su rol y expone las acciones sobre ellas.
// role: 'TRABAJADOR' | 'CONTRATANTE'
// action: 'accept' | 'reject' | 'complete' | 'acceptConflict' | 'cancel'
const NEXT_STATE = {
  accept: 'ACCEPTED',
  reject: 'REJECTED',
  complete: 'COMPLETED',
  acceptConflict: 'ACCEPTED',
  cancel: 'CANCELED',
};

// Las más recientes primero, según la fecha en que se creó la solicitud.
function newestFirst(list) {
  return [...list].sort((a, b) => {
    const left = a?.dateCreated ? new Date(a.dateCreated).getTime() : 0;
    const right = b?.dateCreated ? new Date(b.dateCreated).getTime() : 0;
    return right - left;
  });
}

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
          setRequests(newestFirst(Array.isArray(data) ? data : []));
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
      // La tarjeta cambia al instante; la petición (y su correo) termina en segundo plano.
      const next = NEXT_STATE[action];
      if (next) {
        setRequests((current) =>
          current.map((request) => (request.id === id ? { ...request, state: next } : request)),
        );
      }
      try {
        await requestsService[action](id);
        reload();
      } catch (e) {
        setError(e.message);
        reload();
      }
    },
    [reload],
  );

  return { requests, loading, error, reload, act };
}
