import { request } from '../../core/lib/httpClient';

// RF-13. Peticiones para quitar un rol: el usuario las crea y solo el administrador las resuelve

export function pedirQuitarRol(role, reason) {
  return request('/users/me/role-removal-requests', { method: 'POST', body: { role, reason } });
}

export function obtenerMisPeticionesRol() {
  return request('/users/me/role-removal-requests');
}

// filtros opcionales: { status: 'PENDING' | 'APPROVED' | 'REJECTED', userId }
export function listarPeticionesRol({ status, userId } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (userId) params.set('userId', userId);
  const query = params.toString();
  return request(`/admin/role-removal-requests${query ? `?${query}` : ''}`);
}

// accion: 'approve' | 'reject'
export function resolverPeticionRol(id, accion, reason) {
  return request(`/admin/role-removal-requests/${id}/${accion}`, { method: 'PATCH', body: { reason } });
}
