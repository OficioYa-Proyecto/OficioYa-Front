import { request } from '../../core/lib/httpClient';

const BASE = '/reputation';

export function obtenerReputacion(trabajadorId, token) {
  return request(`${BASE}/trabajadores/${trabajadorId}`, { token });
}

/** Calificación de un contratante: { contratanteId, promedioCalificaciones, totalResenas }. */
export function obtenerReputacionContratante(contratanteId, token) {
  return request(`${BASE}/contratantes/${contratanteId}`, { token });
}

export function listarResenas(trabajadorId, token) {
  return request(`${BASE}/trabajadores/${trabajadorId}/resenas`, { token });
}

/** Perfil del trabajador en Worker (por el Orchestrator): trae el userId de su cuenta y su oficio principal. */
export function obtenerPerfilWorker(trabajadorId, token) {
  return request(`/workers/${trabajadorId}`, { token });
}

/** Todos los trabajadores activos de Worker; cada uno trae el userId de su cuenta. */
export function listarTrabajadores(token) {
  return request('/workers', { token });
}

/** Barrios habilitados en OficioYa (por el Orchestrator): [{ id, name, locality }]. */
export function listarZonas(token) {
  return request('/zones', { token });
}

/** Datos públicos de cuentas en Users (nombre), por el Orchestrator. */
export function obtenerUsuarios(userIds, token) {
  const consulta = userIds.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
  return request(`/users?${consulta}`, { token });
}

export function calificar(solicitudId, puntuacion, comentario, token) {
  return request(`${BASE}/resenas`, {
    method: 'POST',
    body: { solicitudId, puntuacion, ...(comentario ? { comentario } : {}) },
    token,
  });
}

/** ADMIN: reportes de reseñas, opcionalmente por estado (PENDIENTE, EN_REVISION, RESUELTO). */
export function listarReportes(estado, token) {
  const consulta = estado ? `?estado=${encodeURIComponent(estado)}` : '';
  return request(`${BASE}/reportes${consulta}`, { token });
}

/** Una reseña por su código, para que el ADMIN vea qué se reportó. */
export function obtenerResena(codigo, token) {
  return request(`${BASE}/resenas/${codigo}`, { token });
}

/** ADMIN: resuelve un reporte retirando (RESENA_RETIRADA) o manteniendo (RESENA_MANTENIDA) la reseña. */
export function resolverReporte(reporteId, resultado, token) {
  return request(`${BASE}/reportes/${reporteId}/resolucion`, {
    method: 'POST',
    body: { resultado },
    token,
  });
}

export function reportarResena(codigo, motivo, descripcion, token) {
  return request(`${BASE}/resenas/${codigo}/reportes`, {
    method: 'POST',
    body: { motivo, ...(descripcion ? { descripcion } : {}) },
    token,
  });
}
