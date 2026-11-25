import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import estilosBoton from '../../core/design-system/Button.module.css';
import ErrorMessage from '../../core/components/ErrorMessage';
import { leerSesion } from '../sesion';
import { PERFILES } from '../config';
import { decimal, fecha } from '../formatos';
import { useCuentaTrabajador } from '../hooks/useCuentaTrabajador';
import { usePerfilTrabajador } from '../hooks/usePerfilTrabajador';
import Avatar from './Avatar';
import Estrellas from './Estrellas';
import ReportarModal from './ReportarModal';
import styles from './PerfilTrabajadorPage.module.css';

const RESENAS_VISIBLES = 10;
const PERFIL_DESCONOCIDO = { nombre: 'Profesional', oficio: '' };

function PerfilTrabajadorPage() {
  const { id } = useParams();
  const location = useLocation();
  const { token, roles, userId: miUserId } = leerSesion();
  const { cargando, error, reputacion, resenas, reintentar } = usePerfilTrabajador(id, token);
  const [enReporte, setEnReporte] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const cuenta = useCuentaTrabajador(id, token);
  // Nombre y oficio llegan desde la tarjeta de búsqueda. Si se abre el enlace directo, se piden a Worker y Users.
  const perfil = PERFILES[id] ?? location.state ?? (cuenta?.nombre ? cuenta : PERFIL_DESCONOCIDO);
  const puedeReportar = roles.includes('CONTRATANTE') || roles.includes('TRABAJADOR');

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
    return <p className={styles.estado}>Cargando perfil…</p>;
  }

  const pausado = reputacion.estado === 'PAUSADO';
  // Nueva solicitud recibe el userId de la cuenta del trabajador (es el id que guarda Service).
  const puedeContratar = roles.includes('CONTRATANTE') && !pausado && cuenta?.userId && cuenta.userId !== miUserId;
  // El oficio que se ve en el perfil (el buscado, si vino de Search); si no lo ofrece, su oficio principal.
  const oficioContratado = cuenta?.oficios?.find((item) => item.nombre === perfil.oficio) ?? cuenta?.oficios?.[0];

  return (
    <section className={styles.pagina}>
      <aside className={`card ${styles.resumen}`}>
        <div className={styles.persona}>
          <Avatar nombre={perfil.nombre} tamano={72} />
          <div>
            <h1>{perfil.nombre}</h1>
            <p>{perfil.oficio}</p>
            {pausado && <span className={styles.pausado}>Pausado</span>}
          </div>
        </div>
        <div className={styles.calificacion}>
          <strong>{decimal(reputacion.reputacion)}</strong>
          <div>
            <Estrellas valor={reputacion.reputacion} />
            <p>{reputacion.totalResenas} reseñas de clientes</p>
          </div>
        </div>
        {pausado && <p className={styles.aviso}>No acepta nuevos servicios por el momento.</p>}
        {puedeContratar && (
          <Link
            to={`/nueva-solicitud/${cuenta.userId}`}
            state={{
              nombre: perfil.nombre,
              oficio: oficioContratado?.nombre ?? perfil.oficio,
              oficioId: oficioContratado?.id ?? '',
              zonaIds: cuenta.zonaIds,
              franjas: cuenta.franjas,
            }}
            className={`${estilosBoton.button} ${estilosBoton.primary} ${styles.contratar}`}
          >
            Contratar
          </Link>
        )}
      </aside>

      <div className={styles.resenas}>
        <div>
          <span className="eyebrow">Reseñas</span>
          <h2>Reseñas recientes</h2>
        </div>
        {mensaje && <p role="status" className={styles.mensaje}>{mensaje}</p>}
        {resenas.length === 0 && <p>Este profesional aún no tiene reseñas.</p>}
        {resenas.slice(0, RESENAS_VISIBLES).map((resena) => (
          <article key={resena.codigo} className={`card ${styles.resena}`}>
            <div className={styles.autor}>
              <Avatar nombre="Cliente" tamano={38} />
              <div>
                <strong>Cliente</strong>
                <small>{fecha(resena.fechaCreacion)}</small>
              </div>
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
        <small className={styles.nota}>Reseñas de clientes con un servicio finalizado.</small>
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

export default PerfilTrabajadorPage;
