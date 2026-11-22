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

  // CONTRATANTE. El back responde texto plano ("Request deleted"), no JSON,
  // y httpClient intenta leerlo como JSON: ese SyntaxError no es un fallo real.
  remove: async (id) => {
    try {
      await request(`${BASE}/${id}`, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
    }
  },
};
