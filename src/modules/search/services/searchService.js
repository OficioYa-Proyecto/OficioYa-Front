import { request } from '../../core/lib/httpClient';

const BASE = '/search';

// Quita los filtros vacíos para no enviarlos al back.
function criterios(filtros) {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '' && valor !== false && valor != null),
  );
}

// Search recibe listas como parámetros repetidos: barrioIds=10&barrioIds=11.
function consulta(filtros) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(criterios(filtros))) {
    if (Array.isArray(valor)) {
      valor.filter((item) => item !== '' && item != null).forEach((item) => params.append(clave, item));
    } else {
      params.append(clave, valor);
    }
  }
  return params;
}

/** Zonas reales del Orchestrator: [{ id, name, locality }]. Son los ids que Worker guarda por trabajador. */
export function listarZonas(token) {
  return request('/zones', { token });
}

export function listarOficios(token) {
  return request(`${BASE}/oficios`, { token });
}

export function buscarPorOficio(oficioId, filtros, token) {
  return request(`${BASE}/oficios/${oficioId}/trabajadores?${consulta(filtros)}`, { token });
}

export function buscarPorTexto(texto, filtros, token) {
  const { barrioIds, ...resto } = criterios(filtros);
  const ids = Array.isArray(barrioIds)
    ? barrioIds.filter((id) => id !== '' && id != null)
    : barrioIds
      ? [barrioIds]
      : [];
  const cuerpo = { ...resto, ...(ids.length > 0 ? { barrioIds: ids } : {}) };
  return request(`${BASE}/lenguaje-natural`, {
    method: 'POST',
    body: { texto, criterios: cuerpo },
    token,
  });
}
