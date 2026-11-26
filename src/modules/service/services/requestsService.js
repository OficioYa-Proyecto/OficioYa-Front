import { request } from '../../core/lib/httpClient';

const BASE = '/requests';

// httpClient ya agrega el token de la sesión (Authorization: Bearer ...) en cada petición.
export const requestsService = {
  // Solicitudes del usuario según su rol: el back separa el listado
  // (/requests/worker para TRABAJADOR y /requests/contractor para CONTRATANTE).
  listMine: (role) => request(role === 'TRABAJADOR' ? `${BASE}/worker` : `${BASE}/contractor`),

  // TRABAJADOR
  accept: (id) => request(`${BASE}/${id}/accept`, { method: 'PATCH' }),
  reject: (id) => request(`${BASE}/${id}/reject`, { method: 'PATCH' }),
  complete: (id) => request(`${BASE}/${id}/complete`, { method: 'PATCH' }),

  // CONTRATANTE
  acceptConflict: (id) => request(`${BASE}/${id}/accept-conflict`, { method: 'PATCH' }),

  // CONTRATANTE o TRABAJADOR
  cancel: (id) => request(`${BASE}/${id}/cancel`, { method: 'PATCH' }),
};
