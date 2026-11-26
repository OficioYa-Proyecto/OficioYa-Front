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

export function useBusqueda(token) {
  const [oficios, setOficios] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [errorOficios, setErrorOficios] = useState(null);
  const [oficioElegido, setOficioElegido] = useState(null);
  const [texto, setTexto] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState(null);

  // Sin elegir oficio ni escribir nada se muestran todos los trabajadores.
  const oficioId = oficioElegido;
  const clave = JSON.stringify({ oficioId, texto, filtros, intento });
  const cargando = respuesta?.clave !== clave;

  useEffect(() => {
    searchService
      .listarOficios(token)
      .then((lista) => setOficios(Array.isArray(lista) ? lista : []))
      .catch((error) => setErrorOficios(error.message));
    // Si las zonas no cargan, la búsqueda sigue funcionando; solo queda "Todas las zonas".
    searchService
      .listarZonas(token)
      .then((lista) => setZonas(Array.isArray(lista) ? lista : []))
      .catch(() => setZonas([]));
  }, [token]);

  useEffect(() => {
    let vigente = true;
    let peticion;
    if (texto !== null) {
      peticion = searchService.buscarPorTexto(texto, filtros, token);
    } else if (oficioId !== null) {
      peticion = searchService.buscarPorOficio(oficioId, filtros, token);
    } else {
      peticion = searchService.buscarTodos(filtros, token);
    }
    peticion
      .then((resultado) => vigente && setRespuesta({ clave, resultado }))
      .catch((error) => vigente && setRespuesta({ clave, error: error.message }));
    return () => {
      vigente = false;
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
    resultado: cargando ? null : respuesta?.resultado,
    error: cargando ? null : respuesta?.error,
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
      setIntento((actual) => actual + 1);
    },
  };
}
