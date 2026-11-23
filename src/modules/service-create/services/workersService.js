import { request } from '../../core/lib/httpClient';
import { tokenStorage } from '../../service/services/tokenStorage';

const MIN_TEXT = 3;
const MAX_TEXT = 500;
const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const RATE_UNITS = {
  PER_HOUR: 'por hora',
  PER_JOB: 'por trabajo',
  PER_DAY: 'por d\u00eda',
};

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

  search: async ({ description, neighborhoodId, date, time }) => {
    const text = (description ?? '').trim().slice(0, MAX_TEXT);
    if (text.length < MIN_TEXT) {
      throw new Error('Describe un poco m\u00e1s el servicio para buscar trabajadores.');
    }
    const token = tokenStorage.get();
    const criterios = {
      barrioIds: neighborhoodId ? [Number(neighborhoodId)] : undefined,
      diaSemana: weekdayOf(date),
      hora: timeOf(time),
    };
    const response = await request('/search/lenguaje-natural', {
      method: 'POST',
      body: { texto: text, criterios },
      token: token || undefined,
    });
    const results = Array.isArray(response?.resultados) ? response.resultados : [];
    const workers = results.filter((item) => item.trabajadorId).map(toWorker);
    const message = workers.length > 0 ? '' : response?.mensaje || '';
    return { workers, message };
  },

  lookup: async () => {
    const token = tokenStorage.get();
    const workers = await request('/workers', token ? { token } : undefined);
    return (workers ?? []).filter((w) => w.userId).map(toLookupWorker);
  },
};
