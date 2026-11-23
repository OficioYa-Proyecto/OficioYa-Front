import { request } from '../../core/lib/httpClient';

const TIMEOUT_MS = 20000;

let cache = null;
let pending = null;

function withTimeout(promise) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Los barrios tardaron demasiado en cargar.'));
    }, TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalize(zones) {
  return (zones ?? [])
    .filter((zone) => zone.id != null && zone.name)
    .map((zone) => ({ id: zone.id, name: zone.name, locality: zone.locality || '' }));
}

export const zonesService = {
  list: () => {
    if (cache && cache.length > 0) {
      return Promise.resolve(cache);
    }
    if (!pending) {
      pending = withTimeout(request('/zones'))
        .then((zones) => {
          cache = normalize(zones);
          return cache;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  },
};
