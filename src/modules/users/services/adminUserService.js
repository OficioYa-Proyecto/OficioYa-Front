import { request } from '../../core/lib/httpClient';

export function listUsers(token) {
  return request('/admin/users', { token });
}

export function getUser(id, token) {
  return request(`/admin/users/${id}`, { token });
}

// action: 'activate' | 'deactivate'
export function changeStatus(id, action, reason, token) {
  return request(`/admin/users/${id}/${action}`, { method: 'PATCH', body: { reason }, token });
}

// RF-13. Solo el admin quita roles (sin motivo); si había una petición pendiente para ese rol queda aprobada
export function removeRole(id, rol, token) {
  return request(`/admin/users/${id}/roles/${rol}`, { method: 'DELETE', token });
}