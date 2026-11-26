import { listarLocalidades } from '../../users/services/profileService';

let cache = null;
let pending = null;

function normalize(localities) {
  return (localities ?? [])
    .filter((locality) => locality.id != null && locality.name)
    .map((locality) => ({ id: locality.id, name: locality.name }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es'));
}

export const localitiesService = {
  list: () => {
    if (cache && cache.length > 0) {
      return Promise.resolve(cache);
    }
    if (!pending) {
      pending = listarLocalidades()
        .then((localities) => {
          cache = normalize(localities);
          return cache;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  },
};
