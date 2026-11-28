import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import ErrorMessage from '../../core/components/ErrorMessage';
import { leerSesion } from '../sesion';
import { decimal, fecha } from '../formatos';
import { useAutores } from '../hooks/useAutores';
import { useFotoPerfil } from '../hooks/useFotoPerfil';
import { usePerfilContratante } from '../hooks/usePerfilContratante';
import { useResenasDeContratante } from '../hooks/useResenasDeContratante';
import Skeleton from '../../users/components/Skeleton';
import Avatar from './Avatar';
import AutorResena from './AutorResena';
import { Contacto } from './DetallesTrabajador';
import Estrellas from './Estrellas';
import ReportarModal from './ReportarModal';
import styles from './PerfilTrabajadorPage.module.css';

const RESENAS_VISIBLES = 10;

/**
 * Perfil público de un contratante: lo abre el trabajador desde "Mis trabajos" para ver cómo lo han calificado
 * otros trabajadores. La ruta usa la cuenta de Users (el contractorId de Service), que es el id que guarda Reputation.
 */
function PerfilContratantePage() {
  const { id } = useParams();
  const location = useLocation();
  const { token, roles } = leerSesion();
  const { cargando, error, perfil, reintentar } = usePerfilContratante(id, token);
  const resenas = useResenasDeContratante(id, token, true);
  const autores = useAutores(resenas.resenas, token);
  const foto = useFotoPerfil(id);
  const [enReporte, setEnReporte] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const puedeReportar = roles.includes('CONTRATANTE') || roles.includes('TRABAJADOR');
  // El nombre llega desde la tarjeta de Mis trabajos; con el enlace directo se usa el de Users.
  const nombre = location.state?.nombre || perfil?.nombre || 'Contratante';

  function alReportar() {
    setEnReporte(null);
    setMensaje('Tu reporte quedó pendiente de revisión. Le enviamos un correo al administrador.');
  }

  if (error) {
    return (
      <div className={styles.estado}>
        <ErrorMessage error={error} />
        <Button variant="secondary" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (cargando) {
    return <section className="card"><Skeleton lines={3} /></section>;
  }

  const total = perfil.totalResenas;

  return (
    <section className={styles.pagina}>
      <header className={`card ${styles.cabecera}`}>
        <Avatar key={foto ?? 'sin-foto'} nombre={nombre} foto={foto} tamano={96} />
        <div className={styles.persona}>
          <span className="eyebrow">Contratante</span>
          <h1>{nombre}</h1>
          <p>Cliente en OficioYa</p>
        </div>
        <div className={styles.lateral}>
          <div className={styles.calificacion}>
            <strong>{total > 0 ? decimal(perfil.promedio) : '—'}</strong>
            <div>
              <Estrellas valor={perfil.promedio} />
              <p>{total} {total === 1 ? 'reseña' : 'reseñas'} de trabajadores</p>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.columnas}>
        <aside className={styles.pila}>
          <Contacto quien="contratante" />
        </aside>

        <div className={styles.pila}>
          <section className={`card ${styles.resenas}`}>
            <h2>Reseñas recientes</h2>
            {mensaje && <p role="status" className={styles.mensaje}>{mensaje}</p>}
            <div className={styles.panelResenas}>
              {resenas.cargando && <div className="card"><Skeleton lines={2} /></div>}
              {resenas.error && <ErrorMessage error={resenas.error} />}
              {!resenas.cargando && !resenas.error && resenas.resenas.length === 0 && (
                <p>Este contratante aún no tiene reseñas.</p>
              )}
              {resenas.resenas.slice(0, RESENAS_VISIBLES).map((resena) => (
                <article key={resena.codigo} className={`card ${styles.resena}`}>
                  <div className={styles.autor}>
                    <AutorResena autorId={resena.autorId} nombre={autores[resena.autorId]} sinNombre="Trabajador">
                      <small>Trabajador · {fecha(resena.fechaCreacion)}</small>
                    </AutorResena>
                    {puedeReportar && (
                      <Button variant="secondary" onClick={() => setEnReporte(resena)}>
                        Reportar
                      </Button>
                    )}
                  </div>
                  <Estrellas valor={resena.puntuacion} tamano={16} />
                  {resena.comentario && <p>{resena.comentario}</p>}
                </article>
              ))}
              <small className={styles.nota}>Reseñas de trabajadores que le prestaron un servicio a esta persona.</small>
            </div>
          </section>
        </div>
      </div>

      {enReporte && (
        <ReportarModal
          resena={enReporte}
          token={token}
          alReportar={alReportar}
          alCerrar={() => setEnReporte(null)}
        />
      )}
    </section>
  );
}

export default PerfilContratantePage;
