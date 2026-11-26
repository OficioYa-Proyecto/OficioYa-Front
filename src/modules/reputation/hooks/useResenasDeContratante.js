import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

/**
 * Reseñas que los trabajadores le escribieron a esta cuenta como contratante. Solo se piden cuando
 * {@code activo} es true (al abrir la pestaña y si la cuenta tiene el rol CONTRATANTE).
 */
export function useResenasDeContratante(usuarioId, token, activo) {
  const [respuesta, setRespuesta] = useState(null);
  const clave = activo && usuarioId ? usuarioId : null;

  useEffect(() => {
    if (!clave) {
      return undefined;
    }
    let vigente = true;
    reputationService
      .listarResenasDeContratante(clave, token)
      .then((lista) => vigente && setRespuesta({ clave, resenas: Array.isArray(lista) ? lista : [] }))
      .catch(
        () =>
          vigente &&
          setRespuesta({ clave, error: 'No pudimos cargar las reseñas como contratante. Inténtalo más tarde.', resenas: [] }),
      );
    return () => {
      vigente = false;
    };
  }, [clave, token]);

  const lista = respuesta?.clave === clave ? respuesta : null;
  return {
    cargando: Boolean(clave) && !lista,
    error: lista?.error ?? null,
    resenas: lista?.resenas ?? [],
  };
}
