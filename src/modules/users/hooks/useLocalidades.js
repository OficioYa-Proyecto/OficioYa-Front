import { useEffect, useState } from 'react';
import { listarLocalidades } from '../services/profileService';

// RF-14. Si el catálogo no carga, el selector queda vacío y no se puede guardar ni registrar
export function useLocalidades() {
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    listarLocalidades().then(setLocalidades).catch(() => setLocalidades([]));
  }, []);

  return localidades;
}