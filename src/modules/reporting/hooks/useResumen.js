import { useEffect, useState } from 'react';
import * as reportingService from '../services/reportingService';

const RANGO_INICIAL = { desde: '', hasta: '' };
const ESPERA_MS = 400;

export function useResumen(token) {
  const [rango, setRango] = useState(RANGO_INICIAL);
  const [consulta, setConsulta] = useState(RANGO_INICIAL);
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(() => {
    const reporte = reportingService.leerResumenEnCache(RANGO_INICIAL);
    return reporte ? { clave: null, reporte } : null;
  });
  const clave = `${consulta.desde}-${consulta.hasta}-${intento}`;
  const cargando = respuesta?.clave !== clave || rango !== consulta;

  useEffect(() => {
    if (rango === consulta) return undefined;
    const temporizador = setTimeout(() => setConsulta(rango), ESPERA_MS);
    return () => clearTimeout(temporizador);
  }, [rango, consulta]);

  useEffect(() => {
    let vigente = true;
    reportingService
      .obtenerResumen(consulta, token)
      .then((reporte) => vigente && setRespuesta({ clave, reporte }))
      .catch((error) => vigente && setRespuesta((anterior) => ({ clave, reporte: anterior?.reporte, error: error.message })));
    return () => {
      vigente = false;
    };
  }, [clave, consulta, token]);

  return {
    cargando,
    error: respuesta?.clave === clave ? respuesta.error ?? null : null,
    // Mientras carga un periodo nuevo se sigue mostrando el anterior.
    reporte: respuesta?.reporte ?? null,
    rango,
    cambiarRango: setRango,
    reintentar: () => setIntento((actual) => actual + 1),
  };
}