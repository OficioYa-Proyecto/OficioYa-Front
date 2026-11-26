import { useEffect, useMemo, useState } from 'react';
import { getWorker, listZones } from '../../workers/services/workersService';

// Las solicitudes en disputa traen el workerId, pero no la tarifa ni la cobertura.
// Worker sí las tiene en el perfil; Users aporta el nombre aparte (useUserNames).
export function useConflictWorkers(requests) {
  const [profiles, setProfiles] = useState({});
  const [zones, setZones] = useState([]);

  const workerIds = useMemo(() => {
    const ids = requests
      .filter((request) => request?.state === 'CONFLICT' && request?.workerId)
      .map((request) => request.workerId);
    return [...new Set(ids)].sort();
  }, [requests]);

  // key estable: evita volver a pedir los perfiles cuando solo cambia el estado de una tarjeta.
  const key = workerIds.join(',');

  useEffect(() => {
    let vigente = true;
    listZones()
      .then((lista) => {
        if (vigente) setZones(Array.isArray(lista) ? lista : []);
      })
      .catch(() => {
        if (vigente) setZones([]);
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return undefined;
    Promise.all(
      ids.map(async (id) => {
        try {
          return [id, await getWorker(id)];
        } catch {
          return [id, null];
        }
      }),
    ).then((entradas) => {
      if (vigente) setProfiles(Object.fromEntries(entradas));
    });
    return () => {
      vigente = false;
    };
  }, [key]);

  return { profiles, zones };
}
