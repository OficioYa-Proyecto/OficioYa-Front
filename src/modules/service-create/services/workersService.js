import { request } from '../../core/lib/httpClient';
import { buscarPorOficio } from '../../search/services/searchService';

const SEARCH_TTL_MS = 60 * 1000;
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const RATE_UNITS = {
  PER_HOUR: 'por hora',
  PER_JOB: 'por trabajo',
  PER_DAY: 'por d\u00eda',
};

const searchCache = new Map();

function cachedSearch(key, run) {
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) {
    return hit.promise;
  }
  const promise = run();
  searchCache.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (searchCache.get(key)?.promise === promise) {
      searchCache.delete(key);
    }
  });
  return promise;
}

function money(value) {
  return `$${Number(value).toLocaleString('es-CO')}`;
}

function formatLookupRate(primaryTrade) {
  const rate = primaryTrade?.approxRate;
  if (rate == null) return '';
  const unit = RATE_UNITS[primaryTrade.rateUnit];
  return unit ? `Aprox. ${money(rate)} ${unit}` : `Aprox. ${money(rate)}`;
}

function toLookupWorker(raw, index) {
  return {
    id: raw.userId,
    // Ya es el id de la cuenta: así resolveUserIds no lo busca como perfil de Worker al enviar.
    userId: raw.userId,
    name: `Trabajador ${index + 1}`,
    trade: raw.primaryTrade?.trade?.name || 'Oficio sin especificar',
    rate: formatLookupRate(raw.primaryTrade),
    availability: raw.availableNow ? 'Disponible ahora' : '',
  };
}

function toWorker(raw) {
  const reviews = Number(raw.totalResenas) || 0;
  const jobs = Number(raw.trabajosCompletados) || 0;
  return {
    id: raw.trabajadorId,
    name: raw.nombreCompleto || 'Trabajador',
    trade: raw.oficio || 'Oficio sin especificar',
    zone: raw.zona || '',
    rate: raw.tarifaAproximada == null ? '' : `Aprox. ${money(raw.tarifaAproximada)}`,
    rating: reviews > 0 ? Number(raw.calificacionPromedio) : null,
    jobs: jobs === 1 ? '1 trabajo' : `${jobs} trabajos`,
    availability: raw.disponibleAhora ? 'Disponible ahora' : '',
    photoUrl: raw.fotoPerfilUrl || '',
  };
}

function weekdayOf(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? '');
  if (!match) return undefined;
  const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getDay();
  return DAYS[day];
}

function timeOf(time) {
  return /^\d{2}:\d{2}/.test(time ?? '') ? time.slice(0, 5) : undefined;
}

export const workersService = {
  isMock: false,
  notice: '',

  // Misma búsqueda por oficio de la página Buscar, con el barrio elegido en el paso 1 añadido al filtro.
  search: async ({ tradeId, neighborhoodId, date, time }) => {
    if (!tradeId) {
      throw new Error('Selecciona el trabajo u oficio para buscar trabajadores.');
    }
    const filtros = { orden: 'MAYOR_A_MENOR' };
    if (neighborhoodId) filtros.barrioIds = String(neighborhoodId);
    const day = weekdayOf(date);
    if (day) filtros.diaSemana = day;
    const hour = timeOf(time);
    if (hour) filtros.hora = hour;
    return cachedSearch(`${tradeId}?${JSON.stringify(filtros)}`, async () => {
      const response = await buscarPorOficio(tradeId, filtros);
      const results = Array.isArray(response?.resultados) ? response.resultados : [];
      const workers = results.filter((item) => item.trabajadorId).map(toWorker);
      return { workers, message: '' };
    });
  },

  lookup: async () => {
    const workers = await request('/workers');
    return (workers ?? []).filter((w) => w.userId).map(toLookupWorker);
  },
};