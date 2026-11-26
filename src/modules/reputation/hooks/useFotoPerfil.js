import { useEffect, useState } from 'react';
import { getProfilePhotoUrl } from '../../core/lib/imageService';
import { getToken } from '../../core/lib/session';

// Las fotos encontradas se recuerdan mientras la pestaña esté abierta (también al recargar con F5).
const CLAVE_SESION = 'oy_fotos_perfil';

function leerGuardadas() {
  try {
    const guardadas = JSON.parse(sessionStorage.getItem(CLAVE_SESION) ?? '{}');
    return guardadas && typeof guardadas === 'object' ? guardadas : {};
  } catch {
    return {};
  }
}

function guardar(usuarioId, url) {
  try {
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ ...leerGuardadas(), [usuarioId]: url }));
  } catch {
    // Sin sessionStorage (modo privado, cuota llena) la caché queda solo en memoria.
  }
}

// Cuenta → URL ya conocida (null si no tiene foto). Solo se guardan en la sesión las fotos encontradas: si
// Imágenes falla, se vuelve a intentar en la siguiente visita.
const conocidas = new Map(Object.entries(leerGuardadas()));
const pendientes = new Map();

function pedirFoto(usuarioId) {
  if (!pendientes.has(usuarioId)) {
    const peticion = getProfilePhotoUrl(usuarioId, getToken()).then((url) => {
      conocidas.set(usuarioId, url ?? null);
      if (url) {
        guardar(usuarioId, url);
      }
      return url ?? null;
    });
    pendientes.set(usuarioId, peticion);
  }
  return pendientes.get(usuarioId);
}

/**
 * URL de la foto de perfil de la cuenta en Users, o null mientras carga o si no tiene foto.
 * Con {@code activo} en false no se pide nada (por ejemplo, una tarjeta que aún no se ve en pantalla).
 */
export function useFotoPerfil(usuarioId, activo = true) {
  const [foto, setFoto] = useState({ usuarioId: null, url: null });
  const conocida = usuarioId && conocidas.has(usuarioId);

  useEffect(() => {
    if (!usuarioId || !activo || conocida) {
      return undefined;
    }
    let vigente = true;
    pedirFoto(usuarioId).then((url) => vigente && setFoto({ usuarioId, url }));
    return () => {
      vigente = false;
    };
  }, [usuarioId, activo, conocida]);

  if (!usuarioId) {
    return null;
  }
  if (conocida) {
    return conocidas.get(usuarioId);
  }
  return foto.usuarioId === usuarioId ? foto.url : null;
}
