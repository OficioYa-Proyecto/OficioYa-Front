import { request } from '../../core/lib/httpClient';

let cache = null;
let pending = null;

function normalize(trades) {
  return (Array.isArray(trades) ? trades : [])
    .filter((trade) => trade.id && trade.nombre)
    .map((trade) => ({
      id: trade.id,
      name: trade.nombre,
      category: trade.categoria?.nombre || 'Otros oficios',
    }));
}

/** Oficios de Worker que Search expone en `/search/oficios`, con su categoría. */
export const tradesService = {
  list: () => {
    if (cache && cache.length > 0) {
      return Promise.resolve(cache);
    }
    if (!pending) {
      pending = request('/search/oficios')
        .then((trades) => {
          cache = normalize(trades);
          return cache;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  },
};
