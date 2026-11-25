import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

// Cuenta del trabajador: el userId (lo necesita Nueva solicitud), su nombre y su oficio principal.
// Si Worker o Users no responden, el perfil se muestra igual, sin el botón Contratar.
async function cargarCuenta(trabajadorId, token) {
  const perfil = await reputationService.obtenerPerfilWorker(trabajadorId, token);
  const userId = perfil?.userId ?? null;
  const oficio = perfil?.primaryTrade?.trade?.name ?? '';
  // Oficios que ofrece (principal primero) y barrios donde trabaja: Nueva solicitud los usa para preseleccionar.
  const oficios = [perfil?.primaryTrade, ...(perfil?.secondaryTrades ?? [])]
    .map((item) => item?.trade)
    .filter((trade) => trade?.id && trade?.name)
    .map((trade) => ({ id: trade.id, nombre: trade.name }));
  const zonaIds = Array.isArray(perfil?.zoneIds) ? perfil.zoneIds : [];
  // Franjas de Worker: RECURRING (día de la semana entre dos fechas) o FIXED (una fecha), con hora de inicio y fin.
  const franjas = (Array.isArray(perfil?.slots) ? perfil.slots : [])
    .filter((slot) => slot?.startTime && slot?.endTime)
    .map((slot) => ({
      tipo: slot.recurrenceType,
      dia: slot.dayOfWeek ?? null,
      desde: slot.startDate ?? null,
      hasta: slot.endDate ?? null,
      inicio: slot.startTime.slice(0, 5),
      fin: slot.endTime.slice(0, 5),
    }));
  let nombre = '';
  if (userId) {
    try {
      const usuarios = await reputationService.obtenerUsuarios([userId], token);
      nombre = (Array.isArray(usuarios) ? usuarios : []).find((u) => u.id === userId)?.name?.trim() ?? '';
    } catch {
      nombre = '';
    }
  }
  return { userId, nombre, oficio, oficios, zonaIds, franjas };
}

export function useCuentaTrabajador(trabajadorId, token) {
  const [cuenta, setCuenta] = useState(null);

  useEffect(() => {
    let vigente = true;
    cargarCuenta(trabajadorId, token)
      .then((datos) => vigente && setCuenta({ trabajadorId, ...datos }))
      .catch(() => vigente && setCuenta({ trabajadorId, userId: null, nombre: '', oficio: '', oficios: [], zonaIds: [], franjas: [] }));
    return () => {
      vigente = false;
    };
  }, [trabajadorId, token]);

  return cuenta?.trabajadorId === trabajadorId ? cuenta : null;
}
