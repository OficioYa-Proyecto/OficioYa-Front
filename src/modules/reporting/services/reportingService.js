import { request } from '../../core/lib/httpClient';

const BASE = '/reporting/reportes/GENERAL';

const VIGENCIA_MS = 5 * 60 * 1000;
const cache = new Map();
const enCurso = new Map();

const claveDe = ({ desde = '', hasta = '' } = {}) => `${desde}|${hasta}`;

function periodo({ desde, hasta } = {}) {
  return new URLSearchParams({ ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) });
}

function guardar(rango, reporte) {
  const item = { reporte, guardadoEn: Date.now() };
  cache.set(claveDe(rango), item);
  if (reporte?.desde && reporte?.hasta) {
    cache.set(claveDe(reporte), item);
  }
}

export function leerResumenEnCache(rango) {
  return cache.get(claveDe(rango))?.reporte ?? null;
}

export function obtenerResumen(rango = {}, token) {
  const clave = claveDe(rango);
  const item = cache.get(clave);
  if (item && Date.now() - item.guardadoEn < VIGENCIA_MS) {
    return Promise.resolve(item.reporte);
  }
  if (enCurso.has(clave)) {
    return enCurso.get(clave);
  }

  const promesa = request(`${BASE}?${periodo(rango)}`, { token })
    .then((reporte) => {
      guardar(rango, reporte);
      return reporte;
    })
    .finally(() => enCurso.delete(clave));
  enCurso.set(clave, promesa);
  return promesa;
}

export function precargarResumen() {
  obtenerResumen({}).catch(() => {});
}

export function exportarCsv(rango, token) {
  const consulta = periodo(rango);
  consulta.set('formato', 'CSV');
  return request(`${BASE}/exportacion?${consulta}`, { token, responseType: 'blob' });
}