import { request } from '../../core/lib/httpClient';

export function listUsers() {
  return request('/admin/users');
}

export function getUser(id) {
  return request(`/admin/users/${id}`);
}

// action: 'activate' | 'deactivate'
export function changeStatus(id, action, reason) {
  return request(`/admin/users/${id}/${action}`, { method: 'PATCH', body: { reason } });
}

// RF-13. Solo el admin quita roles (sin motivo); si había una petición pendiente para ese rol queda aprobada
export function removeRole(id, rol) {
  return request(`/admin/users/${id}/roles/${rol}`, { method: 'DELETE' });
}