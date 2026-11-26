import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

/**
 * Nombre de cada autor de las reseñas: { [autorId]: nombre }, pedido a Users en una sola consulta.
 * Si Reputation aún no envía {@code autorId} o Users no responde, queda vacío y la reseña sale como "Cliente".
 */
export function useAutores(resenas, token) {
  const ids = [...new Set(resenas.map((resena) => resena.autorId).filter(Boolean))].sort();
  const clave = ids.join(',');
  const [respuesta, setRespuesta] = useState({ clave: '', nombres: {} });

  useEffect(() => {
    if (!clave) {
      return undefined;
    }
    let vigente = true;
    reputationService
      .obtenerUsuarios(clave.split(','), token)
      .then((usuarios) => {
        const nombres = Object.fromEntries(
          (Array.isArray(usuarios) ? usuarios : [])
            .filter((usuario) => usuario?.id && usuario?.name?.trim())
            .map((usuario) => [usuario.id, usuario.name.trim()]),
        );
        if (vigente) {
          setRespuesta({ clave, nombres });
        }
      })
      .catch(() => vigente && setRespuesta({ clave, nombres: {} }));
    return () => {
      vigente = false;
    };
  }, [clave, token]);

  return respuesta.clave === clave ? respuesta.nombres : {};
}
