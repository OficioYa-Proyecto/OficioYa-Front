import { request } from '../../core/lib/httpClient';
import { saveSession } from '../../core/lib/session';

export function obtenerMiPerfil() {
  return request('/users/me');
}

export function actualizarMiPerfil(datos) {
  return request('/users/me', { method: 'PATCH', body: datos });
}

export async function agregarRol(rol) {
  const data = await request(`/users/me/roles/${rol}`, { method: 'POST' });
  if (data?.token) {
    saveSession({
      token: data.token,
      userId: data.id,
      roles: data.roles,
    });
    window.dispatchEvent(new Event('oy-profile-updated'));
  } else {
    try {
      const refreshed = await request('/auth/refresh', { method: 'POST' });
      if (refreshed?.token) {
        saveSession({
          token: refreshed.token,
          userId: refreshed.userId,
          roles: refreshed.roles,
        });
        window.dispatchEvent(new Event('oy-profile-updated'));
      }
    } catch {
      // Si el endpoint no responde se conserva la sesion previa
    }
  }
  return data;
}

export function obtenerMisTelefonos() {
  return request('/users/me/phones');
}

export function agregarTelefono(numero) {
  return request('/users/me/phones', { method: 'POST', body: { number: numero } });
}

export function cambiarTelefono(id, numero) {
  return request(`/users/me/phones/${id}`, { method: 'PATCH', body: { number: numero } });
}

export function eliminarTelefono(id) {
  return request(`/users/me/phones/${id}`, { method: 'DELETE' });
}

export function obtenerPerfilPublico(id) {
  return request(`/users/${id}`);
}

export function listarLocalidades() {
  return request('/localities');
}