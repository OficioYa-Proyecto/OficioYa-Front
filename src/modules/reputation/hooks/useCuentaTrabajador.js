import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

// Cuenta del trabajador: el userId (lo necesita Nueva solicitud), su nombre y su oficio principal.
// Si Worker o Users no responden, el perfil se muestra igual, sin el botón Contratar.
async function cargarCuenta(trabajadorId, token) {
  const perfil = await reputationService.obtenerPerfilWorker(trabajadorId, token);
  const userId = perfil?.userId ?? null;
  const oficio = perfil?.primaryTrade?.trade?.name ?? '';
  let nombre = '';
  if (userId) {
    try {
      const usuarios = await reputationService.obtenerUsuarios([userId], token);
      nombre = (Array.isArray(usuarios) ? usuarios : []).find((u) => u.id === userId)?.name?.trim() ?? '';
    } catch {
      nombre = '';
    }
  }
  return { userId, nombre, oficio };
}

export function useCuentaTrabajador(trabajadorId, token) {
  const [cuenta, setCuenta] = useState(null);

  useEffect(() => {
    let vigente = true;
    cargarCuenta(trabajadorId, token)
      .then((datos) => vigente && setCuenta({ trabajadorId, ...datos }))
      .catch(() => vigente && setCuenta({ trabajadorId, userId: null, nombre: '', oficio: '' }));
    return () => {
      vigente = false;
    };
  }, [trabajadorId, token]);

  return cuenta?.trabajadorId === trabajadorId ? cuenta : null;
}
