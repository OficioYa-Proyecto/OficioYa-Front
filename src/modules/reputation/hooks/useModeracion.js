import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';

// Reportes del estado elegido, cada uno con la reseña reportada. Si una reseña no se puede leer, el reporte
// se muestra igual (sin el texto de la reseña) para que el ADMIN pueda resolverlo.
const resenasPedidas = new Map();

function pedirResena(codigo, token) {
  if (!resenasPedidas.has(codigo)) {
    const promesa = reputationService.obtenerResena(codigo, token).catch(() => {
      resenasPedidas.delete(codigo);
      return null;
    });
    resenasPedidas.set(codigo, promesa);
  }
  return resenasPedidas.get(codigo);
}

export function useModeracion(token) {
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(null);
  const [resenas, setResenas] = useState({});

  useEffect(() => {
    let vigente = true;
    reputationService
      .listarReportes(undefined, token)
      .then((datos) => {
        if (!vigente) return;
        const reportes = Array.isArray(datos) ? datos : [];
        setRespuesta({ reportes });
        const codigos = [...new Set(reportes.map((reporte) => reporte.codigoResena).filter(Boolean))];
        codigos.forEach((codigo) => {
          pedirResena(codigo, token).then((resena) => {
            if (vigente) setResenas((actuales) => ({ ...actuales, [codigo]: resena }));
          });
        });
      })
      .catch((error) => {
        if (vigente) setRespuesta((anterior) => (anterior?.reportes ? anterior : { error: error.message }));
      });
    return () => {
      vigente = false;
    };
  }, [intento, token]);

  async function resolver(reporteId, resultado) {
    const actualizado = await reputationService.resolverReporte(reporteId, resultado, token);
    setRespuesta((anterior) => ({
      ...anterior,
      reportes: (anterior?.reportes ?? []).map((reporte) =>
        reporte.id === reporteId
          ? {
              ...reporte,
              estado: 'RESUELTO',
              resultado: actualizado?.resultado ?? resultado,
              fechaResolucion: actualizado?.fechaResolucion ?? new Date().toISOString(),
            }
          : reporte,
      ),
    }));
    setIntento((actual) => actual + 1);
    return actualizado;
  }

  return {
    cargando: !respuesta,
    error: respuesta?.reportes ? null : respuesta?.error ?? null,
    reportes: respuesta?.reportes ?? [],
    resenas,
    resolver,
    recargar: () => {
      setRespuesta(null);
      setIntento((actual) => actual + 1);
    },
  };
}