import { useEffect, useRef, useState } from 'react';
import { request } from '../../core/lib/httpClient';

// Nombres públicos de cuentas (servicio Users, por el orquestador): GET /users?ids=...
// Devuelve un objeto { [userId]: nombre }. Si el servicio no responde, no hay nombre
// y la tarjeta se muestra igual.
export function useUserNames(ids) {
  const [names, setNames] = useState({});
  const asked = useRef(new Set());
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');

  useEffect(() => {
    const missing = key ? key.split(',').filter((id) => !asked.current.has(id)) : [];
    if (missing.length === 0) {
      return;
    }
    missing.forEach((id) => asked.current.add(id));
    const query = missing.map((id) => `ids=${encodeURIComponent(id)}`).join('&');
    request(`/users?${query}`)
      .then((users) => {
        const found = {};
        (Array.isArray(users) ? users : []).forEach((user) => {
          if (user?.id && user?.name?.trim()) {
            found[user.id] = user.name.trim();
          }
        });
        setNames((current) => ({ ...current, ...found }));
      })
      .catch(() => {});
  }, [key]);

  return names;
}
