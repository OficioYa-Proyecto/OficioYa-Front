import { useEffect, useState } from 'react';
import { ACCESS_TOKEN } from '../config';
import {
  listarPeticionesRol,
  obtenerMisPeticionesRol,
  pedirQuitarRol,
  resolverPeticionRol,
} from '../services/roleRequestService';

// RF-13. Peticiones propias (Editar perfil); la más reciente primero
export function useMisPeticionesRol() {
  const [peticiones, setPeticiones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerMisPeticionesRol(ACCESS_TOKEN)
      .then(setPeticiones)
      .catch(() => setPeticiones([]))
      .finally(() => setCargando(false));
  }, []);

  async function pedir(rol, razon) {
    const nueva = await pedirQuitarRol(rol, razon, ACCESS_TOKEN);
    setPeticiones((actuales) => [nueva, ...actuales]);
  }

  return { peticiones, cargando, pedir };
}

// RF-13. Peticiones para el administrador (bandeja y detalle de usuario)
export function usePeticionesRol({ status, userId } = {}) {
  const [peticiones, setPeticiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    listarPeticionesRol({ status, userId }, ACCESS_TOKEN)
      .then((data) => {
        if (!vigente) return;
        setPeticiones(data);
        setError(null);
      })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setLoading(false));
    return () => {
      vigente = false;
    };
  }, [status, userId, version]);

  const recargar = () => setVersion((v) => v + 1);

  // Lanza el error para que la tarjeta lo muestre; si se resolvió, sale del filtro de pendientes
  async function resolver(id, accion, motivo) {
    const actualizada = await resolverPeticionRol(id, accion, motivo, ACCESS_TOKEN);
    setPeticiones((actuales) => actuales
      .map((p) => (p.id === id ? actualizada : p))
      .filter((p) => !status || p.status === status));
    return actualizada;
  }

  return { peticiones, loading, error, resolver, recargar };
}
