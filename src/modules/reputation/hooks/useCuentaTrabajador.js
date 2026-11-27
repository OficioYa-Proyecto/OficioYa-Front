import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

// Cuenta del trabajador: el userId (lo necesita Nueva solicitud), su nombre y su oficio principal.
// Si Worker o Users no responden, el perfil se muestra igual, sin el botón Contratar.
/**
 * Perfil de Worker a partir del id de la ruta. Search enlaza con el id del perfil, pero Mis servicios enlaza con
 * la cuenta del trabajador (el id que guarda Service). Worker no busca por cuenta, así que en ese caso se busca en
 * la lista de trabajadores el que tiene esa cuenta.
 */
async function perfilDeWorker(id, token) {
  try {
    return await reputationService.obtenerPerfilWorker(id, token);
  } catch (error) {
    const trabajadores = await reputationService.listarTrabajadores(token).catch(() => []);
    const conEsaCuenta = (Array.isArray(trabajadores) ? trabajadores : []).find((t) => t?.userId === id);
    if (conEsaCuenta) {
      return conEsaCuenta;
    }
    throw error;
  }
}

async function cargarCuenta(trabajadorId, token) {
  const perfil = await perfilDeWorker(trabajadorId, token);
  const userId = perfil?.userId ?? null;
  const oficio = perfil?.primaryTrade?.trade?.name ?? '';
  const categoria = perfil?.primaryTrade?.trade?.category?.name ?? '';
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
  // Tarifa de cada oficio, fotos de trabajos realizados y si está disponible ahora: se muestran en el perfil.
  const tarifas = [perfil?.primaryTrade, ...(perfil?.secondaryTrades ?? [])]
    .filter((item) => item?.trade?.name)
    .map((item) => ({ nombre: item.trade.name, tarifa: item.approxRate ?? null, unidad: item.rateUnit ?? null }));
  const fotos = (Array.isArray(perfil?.photos) ? perfil.photos : [])
    .filter((foto) => foto?.url)
    .map((foto) => ({ id: foto.id ?? foto.url, url: foto.url, descripcion: foto.description ?? '' }));
  const disponibleAhora = Boolean(perfil?.availableNow);
  let nombre = '';
  // null si Users no respondió: así no se afirma que la persona no es contratante sin saberlo.
  let roles = null;
  if (userId) {
    try {
      const usuarios = await reputationService.obtenerUsuarios([userId], token);
      const usuario = (Array.isArray(usuarios) ? usuarios : []).find((u) => u.id === userId);
      nombre = usuario?.name?.trim() ?? '';
      roles = Array.isArray(usuario?.roles) ? usuario.roles : null;
    } catch {
      nombre = '';
    }
  }
  return { userId, nombre, roles, oficio, categoria, oficios, zonaIds, franjas, tarifas, fotos, disponibleAhora };
}

export function useCuentaTrabajador(trabajadorId, token) {
  const [cuenta, setCuenta] = useState(null);

  useEffect(() => {
    let vigente = true;
    cargarCuenta(trabajadorId, token)
      .then((datos) => vigente && setCuenta({ trabajadorId, ...datos }))
      .catch(() => vigente && setCuenta({
          trabajadorId,
          userId: null,
          nombre: '',
          oficio: '',
          categoria: '',
          oficios: [],
          zonaIds: [],
          franjas: [],
          tarifas: [],
          fotos: [],
          disponibleAhora: false,
          roles: null,
        }));
    return () => {
      vigente = false;
    };
  }, [trabajadorId, token]);

  return cuenta?.trabajadorId === trabajadorId ? cuenta : null;
}
