import { useEffect, useState } from 'react';
import { getProfilePhotoUrl } from '../../core/lib/imageService';
import { getToken } from '../../core/lib/session';

// Una sola consulta a Imágenes por cuenta, aunque la misma persona aparezca en varias tarjetas.
const fotos = new Map();

function pedirFoto(usuarioId) {
  if (!fotos.has(usuarioId)) {
    fotos.set(usuarioId, getProfilePhotoUrl(usuarioId, getToken()));
  }
  return fotos.get(usuarioId);
}

/** URL de la foto de perfil de la cuenta en Users, o null mientras carga o si no tiene foto. */
export function useFotoPerfil(usuarioId) {
  const [foto, setFoto] = useState({ usuarioId: null, url: null });

  useEffect(() => {
    if (!usuarioId) {
      return undefined;
    }
    let vigente = true;
    pedirFoto(usuarioId).then((url) => vigente && setFoto({ usuarioId, url }));
    return () => {
      vigente = false;
    };
  }, [usuarioId]);

  return usuarioId && foto.usuarioId === usuarioId ? foto.url : null;
}
