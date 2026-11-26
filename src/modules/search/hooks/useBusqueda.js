import { useEffect, useState } from 'react';
import * as searchService from '../services/searchService';

const FILTROS_INICIALES = {
  barrioIds: '',
  precioMinimo: '',
  precioMaximo: '',
  diaSemana: '',
  franjaHoraria: '',
  soloDisponibleAhora: false,
  orden: 'PERFIL_COMPLETO',
};

// Una búsqueda ya hecha se reutiliza durante este tiempo: al volver desde un perfil no se espera otra vez.
const VIGENCIA_MS = 2 * 60 * 1000;

// Se conserva mientras la página esté abierta (se pierde al recargar). Guarda lo último que se buscó, los
// resultados recientes y los catálogos, para que al volver a Buscar todo aparezca de inmediato.
const memoria = {
  estado: { oficioElegido: null, texto: null, filtros: FILTROS_INICIALES },
  resultados: new Map(),
  oficios: null,
  zonas: null,
};

function enMemoria(clave) {
  const guardado = memoria.resultados.get(clave);
  return guardado && Date.now() - guardado.en < VIGENCIA_MS ? guardado : null;
}

export function useBusqueda(token) {
  const [oficios, setOficios] = useState(() => memoria.oficios ?? []);
  const [zonas, setZonas] = useState(() => memoria.zonas ?? []);
  const [errorOficios, setErrorOficios] = useState(null);
  const [oficioElegido, setOficioElegido] = useState(memoria.estado.oficioElegido);
  const [texto, setTexto] = useState(memoria.estado.texto);
  const [filtros, setFiltros] = useState(memoria.estado.filtros);
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(null);

  // Sin elegir oficio ni escribir nada se muestran todos los trabajadores.
  const oficioId = oficioElegido;
  const clave = JSON.stringify({ oficioId, texto, filtros, intento });
  const vigente = respuesta?.clave === clave ? respuesta : enMemoria(clave);
  const cargando = !vigente;

  useEffect(() => {
    memoria.estado = { oficioElegido, texto, filtros };
  }, [oficioElegido, texto, filtros]);

  useEffect(() => {
    if (memoria.oficios === null) {
      searchService
        .listarOficios(token)
        .then((lista) => {
          memoria.oficios = Array.isArray(lista) ? lista : [];
          setOficios(memoria.oficios);
        })
        .catch((error) => setErrorOficios(error.message));
    }
    // Si las zonas no cargan, la búsqueda sigue funcionando; solo queda "Todas las zonas".
    if (memoria.zonas === null) {
      searchService
        .listarZonas(token)
        .then((lista) => {
          memoria.zonas = Array.isArray(lista) ? lista : [];
          setZonas(memoria.zonas);
        })
        .catch(() => setZonas([]));
    }
  }, [token]);

  useEffect(() => {
    if (enMemoria(clave)) {
      return undefined;
    }
    let activa = true;
    let peticion;
    if (texto !== null) {
      peticion = searchService.buscarPorTexto(texto, filtros, token);
    } else if (oficioId !== null) {
      peticion = searchService.buscarPorOficio(oficioId, filtros, token);
    } else {
      peticion = searchService.buscarTodos(filtros, token);
    }
    peticion
      .then((resultado) => {
        memoria.resultados.set(clave, { clave, resultado, en: Date.now() });
        if (activa) {
          setRespuesta({ clave, resultado });
        }
      })
      .catch((error) => activa && setRespuesta({ clave, error: error.message }));
    return () => {
      activa = false;
    };
  }, [clave, oficioId, texto, filtros, token]);

  return {
    oficios,
    zonas,
    oficioId,
    texto,
    filtros,
    cargando,
    // Si el catálogo de oficios no carga, el listado sigue funcionando; solo no hay categorías para elegir.
    errorOficios,
    resultado: vigente?.resultado,
    error: vigente?.error,
    elegirOficio(id) {
      setTexto(null);
      setOficioElegido(id);
    },
    buscarTexto: setTexto,
    cambiarFiltro(nombre, valor) {
      setFiltros((actuales) => ({ ...actuales, [nombre]: valor }));
    },
    limpiarFiltros() {
      setFiltros((actuales) => ({ ...FILTROS_INICIALES, orden: actuales.orden }));
    },
    reintentar() {
      // Un reintento siempre consulta de nuevo: la clave cambia y no está en memoria.
      setIntento((actual) => actual + 1);
    },
  };
}
