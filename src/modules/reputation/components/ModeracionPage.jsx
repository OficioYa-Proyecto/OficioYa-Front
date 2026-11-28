import { useMemo, useState } from 'react';
import Button from '../../core/design-system/Button';
import ErrorMessage from '../../core/components/ErrorMessage';
import { MOTIVOS_REPORTE } from '../config';
import { fecha } from '../formatos';
import { useModeracion } from '../hooks/useModeracion';
import { leerSesion } from '../sesion';
import Skeleton from '../../users/components/Skeleton';
import Estrellas from './Estrellas';
import styles from './ModeracionPage.module.css';

const FILTROS = [
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'RESUELTO', label: 'Resueltos' },
  { id: '', label: 'Todos' },
];

function coincide(reporte, filtro) {
  if (!filtro) return true;
  if (filtro === 'RESUELTO') return reporte.estado === 'RESUELTO';
  return reporte.estado !== 'RESUELTO';
}

const RESULTADOS = {
  RESENA_RETIRADA: 'Reseña retirada',
  RESENA_MANTENIDA: 'Reseña mantenida',
};

function motivo(valor) {
  return MOTIVOS_REPORTE.find((opcion) => opcion.valor === valor)?.etiqueta ?? valor;
}

function TarjetaReporte({ reporte, resena, alResolver }) {
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);

  async function resolver(resultado) {
    setEnviando(resultado);
    setError(null);
    try {
      await alResolver(reporte.id, resultado);
    } catch (problema) {
      setError(problema.message);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <article className={`card ${styles.reporte}`}>
      <div className={styles.cabecera}>
        <span className={styles.motivo}>{motivo(reporte.motivo)}</span>
        <small className={styles.fecha}>Reportado el {fecha(reporte.fechaReporte)}</small>
      </div>

      <p className={styles.descripcion}>
        <strong>Motivo:</strong> {reporte.descripcion || 'Sin descripción.'}
      </p>

      <div className={styles.resena}>
        <span className="eyebrow">Reseña reportada</span>
        {resena === undefined ? (
          <Skeleton lines={1} />
        ) : resena ? (
          <>
            <Estrellas valor={resena.puntuacion} tamano={16} />
            <p>{resena.comentario || 'Sin comentario.'}</p>
            <small>Publicada el {fecha(resena.fechaCreacion)}</small>
          </>
        ) : (
          <p>No fue posible cargar el texto de la reseña.</p>
        )}
      </div>

      {reporte.estado === 'RESUELTO' ? (
        <p className={styles.resultado}>
          {RESULTADOS[reporte.resultado] ?? reporte.resultado}
          {reporte.fechaResolucion && ` · ${fecha(reporte.fechaResolucion)}`}
        </p>
      ) : (
        <>
          <ErrorMessage error={error} />
          <div className={styles.acciones}>
            <Button
              type="button"
              variant="secondary"
              disabled={enviando !== null}
              onClick={() => resolver('RESENA_MANTENIDA')}
            >
              {enviando === 'RESENA_MANTENIDA' ? 'Manteniendo...' : 'Mantener reseña'}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={enviando !== null}
              onClick={() => resolver('RESENA_RETIRADA')}
            >
              {enviando === 'RESENA_RETIRADA' ? 'Retirando...' : 'Retirar reseña'}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function ModeracionPage() {
  const { token } = leerSesion();
  const [filtro, setFiltro] = useState('PENDIENTE');
  const { cargando, error, reportes: todos, resenas, resolver, recargar } = useModeracion(token);
  const [mensaje, setMensaje] = useState(null);

  const reportes = useMemo(() => todos.filter((reporte) => coincide(reporte, filtro)), [todos, filtro]);

  async function resolverReporte(reporteId, resultado) {
    setMensaje(null);
    await resolver(reporteId, resultado);
    setMensaje(resultado === 'RESENA_RETIRADA' ? 'La reseña fue retirada.' : 'La reseña se mantiene publicada.');
  }

  function cambiarFiltro(valor) {
    setMensaje(null);
    setFiltro(valor);
  }

  return (
    <section className={styles.pagina}>
      <div>
        <span className="eyebrow">Administración</span>
        <h1>Reseñas reportadas</h1>
        <p className={styles.subtitulo}>Revisa cada reporte y decide si la reseña se retira o se mantiene.</p>
      </div>

      <div className={styles.filtros}>
        {FILTROS.map((f) => (
          <Button
            key={f.id || 'TODOS'}
            type="button"
            variant={filtro === f.id ? 'primary' : 'secondary'}
            onClick={() => cambiarFiltro(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {mensaje && <p role="status" className={styles.mensaje}>{mensaje}</p>}

      {cargando || error ? (
        <>
          <div className="card"><Skeleton lines={3} error={error} /></div>
          {error && (
            <div className={styles.estado}>
              <Button type="button" variant="secondary" onClick={recargar}>
                Reintentar
              </Button>
            </div>
          )}
        </>
      ) : reportes.length === 0 ? (
        <div className="card">
          <p>
            {filtro === 'PENDIENTE'
              ? 'No hay reportes pendientes. ¡Todo al día!'
              : filtro === 'RESUELTO'
                ? 'Aún no hay reportes resueltos.'
                : 'Aún no hay reportes.'}
          </p>
        </div>
      ) : (
        <div className={styles.lista}>
          {reportes.map((reporte) => (
            <TarjetaReporte
              key={reporte.id}
              reporte={reporte}
              resena={resenas[reporte.codigoResena]}
              alResolver={resolverReporte}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ModeracionPage;