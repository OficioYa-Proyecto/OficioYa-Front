import { useCallback, useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

/**
 * Datos del perfil de un contratante a partir de su cuenta de Users (el contractorId que guarda Service):
 * su nombre (Users) y su calificación como contratante (Reputation). Las reseñas se piden con useResenasDeContratante.
 * Si Users no responde, el perfil se muestra igual con un nombre genérico.
 */
async function cargarPerfil(usuarioId, token) {
  const [usuarios, calificacion] = await Promise.all([
    reputationService.obtenerUsuarios([usuarioId], token).catch(() => []),
    reputationService.obtenerReputacionContratante(usuarioId, token),
  ]);
  const usuario = (Array.isArray(usuarios) ? usuarios : []).find((u) => u?.id === usuarioId);
  const total = calificacion?.totalResenas ?? 0;
  return {
    nombre: usuario?.name?.trim() ?? '',
    promedio: total > 0 ? (calificacion?.promedioCalificaciones ?? 0) : 0,
    totalResenas: total,
  };
}

export function usePerfilContratante(usuarioId, token) {
  const [respuesta, setRespuesta] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!usuarioId) {
      return undefined;
    }
    let vigente = true;
    cargarPerfil(usuarioId, token)
      .then((perfil) => vigente && setRespuesta({ clave: `${usuarioId}-${intento}`, perfil }))
      .catch(
        () =>
          vigente &&
          setRespuesta({
            clave: `${usuarioId}-${intento}`,
            error: 'No pudimos cargar el perfil del contratante. Inténtalo más tarde.',
          }),
      );
    return () => {
      vigente = false;
    };
  }, [usuarioId, token, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  const actual = respuesta?.clave === `${usuarioId}-${intento}` ? respuesta : null;
  return {
    cargando: !actual,
    error: actual?.error ?? null,
    perfil: actual?.perfil ?? null,
    reintentar,
  };
}
