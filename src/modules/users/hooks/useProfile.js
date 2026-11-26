import { useEffect, useState } from 'react';
import * as profileService from '../services/profileService';

export function useProfile(id) {
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const peticion = id
      ? profileService.obtenerPerfilPublico(id)
      : profileService.obtenerMiPerfil();

    peticion
      .then(setPerfil)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  async function actualizar(datos) {
    setPerfil(await profileService.actualizarMiPerfil(datos));
  }

  async function agregarRol(rol) {
    setPerfil(await profileService.agregarRol(rol));
  }

  return { perfil, cargando, error, actualizar, agregarRol };
}
