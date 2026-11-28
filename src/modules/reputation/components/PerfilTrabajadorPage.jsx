import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import estilosBoton from '../../core/design-system/Button.module.css';
import ErrorMessage from '../../core/components/ErrorMessage';
import { leerSesion } from '../sesion';
import { PERFILES } from '../config';
import { decimal, dinero, fecha, unidad } from '../formatos';
import { useAutores } from '../hooks/useAutores';
import { useCuentaTrabajador } from '../hooks/useCuentaTrabajador';
import { useFotoPerfil } from '../hooks/useFotoPerfil';
import { useResenasDeContratante } from '../hooks/useResenasDeContratante';
import { usePerfilTrabajador } from '../hooks/usePerfilTrabajador';
import Skeleton from '../../users/components/Skeleton';
import Avatar from './Avatar';
import AutorResena from './AutorResena';
import { Cobertura, Contacto, Disponibilidad, OficiosYTarifas, TrabajosRealizados } from './DetallesTrabajador';
import Estrellas from './Estrellas';
import ReportarModal from './ReportarModal';
import styles from './PerfilTrabajadorPage.module.css';

const RESENAS_VISIBLES = 10;
const PERFIL_DESCONOCIDO = { nombre: 'Profesional', oficio: '' };

/** Reseñas que los trabajadores le escribieron a esta persona cuando ella contrató un servicio. */
function ResenasComoContratante({ esContratante, estado, nombres, puedeReportar, alReportar }) {
  if (esContratante === false) {
    return <p>Este usuario no se encuentra registrado como Contratante en OficioYa.</p>;
  }
  if (estado.cargando) {
    return <div className="card"><Skeleton lines={2} /></div>;
  }
  if (estado.error) {
    return <ErrorMessage error={estado.error} />;
  }
  return (
    <>
      {estado.resenas.length === 0 && <p>Aún no tiene reseñas como contratante.</p>}
      {estado.resenas.slice(0, RESENAS_VISIBLES).map((resena) => (
        <article key={resena.codigo} className={`card ${styles.resena}`}>
          <div className={styles.autor}>
            <AutorResena autorId={resena.autorId} nombre={nombres[resena.autorId]} sinNombre="Trabajador">
              <small>Trabajador · {fecha(resena.fechaCreacion)}</small>
            </AutorResena>
            {puedeReportar && (
              <Button variant="secondary" onClick={() => alReportar(resena)}>
                Reportar
              </Button>
            )}
          </div>
          <Estrellas valor={resena.puntuacion} tamano={16} />
          {resena.comentario && <p>{resena.comentario}</p>}
        </article>
      ))}
      <small className={styles.nota}>Reseñas de trabajadores que le prestaron un servicio a esta persona.</small>
    </>
  );
}

function PerfilTrabajadorPage() {
  const { id } = useParams();
  const location = useLocation();
  const { token, roles, userId: miUserId } = leerSesion();
  const cuenta = useCuentaTrabajador(id, token);
  // Reputation guarda las reseñas con la cuenta de Users (el id que usa Service), no con el id del perfil de Worker.
  // Mientras se conoce la cuenta, el perfil sigue "cargando"; si Worker no responde, se usa el id del perfil.
  const idReputacion = cuenta?.trabajadorId === id ? (cuenta.userId ?? id) : null;
  const { cargando, error, reputacion, resenas, reintentar } = usePerfilTrabajador(idReputacion, token);
  const autores = useAutores(resenas, token);
  // Pestañas: lo que le dicen a esta persona como trabajador y lo que le dicen como contratante.
  const [pestana, setPestana] = useState('COMO_TRABAJADOR');
  // null: Users no respondió y no se sabe si es contratante.
  const esContratante = Array.isArray(cuenta?.roles) ? cuenta.roles.includes('CONTRATANTE') : null;
  const comoContratante = useResenasDeContratante(
    idReputacion,
    token,
    pestana === 'COMO_CONTRATANTE' && esContratante !== false,
  );
  const autoresComoContratante = useAutores(comoContratante.resenas, token);
  const [enReporte, setEnReporte] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const foto = useFotoPerfil(cuenta?.userId);
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
    return <section className="card"><Skeleton lines={3} /></section>;
  }

  const pausado = reputacion.estado === 'PAUSADO';
  // Nueva solicitud recibe el userId de la cuenta del trabajador (es el id que guarda Service).
  const puedeContratar = roles.includes('CONTRATANTE') && !pausado && cuenta?.userId && cuenta.userId !== miUserId;
  // El oficio que se ve en el perfil (el buscado, si vino de Search); si no lo ofrece, su oficio principal.
  const oficioContratado = cuenta?.oficios?.find((item) => item.nombre === perfil.oficio) ?? cuenta?.oficios?.[0];

  const tarifaPrincipal = cuenta?.tarifas?.[0];

  return (
    <section className={styles.pagina}>
      <header className={`card ${styles.cabecera}`}>
        <Avatar key={foto ?? 'sin-foto'} nombre={perfil.nombre} foto={foto} tamano={96} />
        <div className={styles.persona}>
          {cuenta?.categoria && <span className="eyebrow">{cuenta.categoria}</span>}
          <h1>{perfil.nombre}</h1>
          <p>{perfil.oficio}</p>
          {pausado && <span className={styles.pausado}>Pausado</span>}
        </div>
        <div className={styles.lateral}>
          {tarifaPrincipal?.tarifa != null && (
            <p className={styles.precio}>
              <span>Desde</span> <strong>{dinero(tarifaPrincipal.tarifa)}</strong>{' '}
              <span>{unidad(tarifaPrincipal.unidad)}</span>
            </p>
          )}
          <div className={styles.calificacion}>
            <strong>{decimal(reputacion.reputacion)}</strong>
            <div>
              <Estrellas valor={reputacion.reputacion} />
              <p>{reputacion.totalResenas} {reputacion.totalResenas === 1 ? 'reseña' : 'reseñas'} de clientes</p>
            </div>
          </div>
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
        </div>
      </header>
      {pausado && <p className={styles.aviso}>No acepta nuevos servicios por el momento.</p>}

      <div className={styles.columnas}>
        <aside className={styles.pila}>
          <Cobertura cuenta={cuenta} token={token} />
          <Contacto />
        </aside>

        <div className={styles.pila}>
          <OficiosYTarifas cuenta={cuenta} />
          <Disponibilidad cuenta={cuenta} />
          <TrabajosRealizados fotos={cuenta?.fotos} />
          <section className={`card ${styles.resenas}`}>
            <h2>Reseñas recientes</h2>
            <div className={styles.pestanas} role="tablist" aria-label="Tipo de reseñas">
              <button
                type="button"
                role="tab"
                id="pestana-como-trabajador"
                aria-selected={pestana === 'COMO_TRABAJADOR'}
                aria-controls="panel-resenas"
                className={pestana === 'COMO_TRABAJADOR' ? styles.pestanaActiva : styles.pestana}
                onClick={() => setPestana('COMO_TRABAJADOR')}
              >
                Reseñas como trabajador
              </button>
              <button
                type="button"
                role="tab"
                id="pestana-como-contratante"
                aria-selected={pestana === 'COMO_CONTRATANTE'}
                aria-controls="panel-resenas"
                className={pestana === 'COMO_CONTRATANTE' ? styles.pestanaActiva : styles.pestana}
                onClick={() => setPestana('COMO_CONTRATANTE')}
              >
                Reseñas como contratante
              </button>
            </div>
            {mensaje && <p role="status" className={styles.mensaje}>{mensaje}</p>}
            <div
              id="panel-resenas"
              role="tabpanel"
              aria-labelledby={pestana === 'COMO_TRABAJADOR' ? 'pestana-como-trabajador' : 'pestana-como-contratante'}
              className={styles.panelResenas}
            >
              {pestana === 'COMO_CONTRATANTE' ? (
                <ResenasComoContratante
                  esContratante={esContratante}
                  estado={comoContratante}
                  nombres={autoresComoContratante}
                  puedeReportar={puedeReportar}
                  alReportar={setEnReporte}
                />
              ) : (
                <>
                  {resenas.length === 0 && <p>Este profesional aún no tiene reseñas.</p>}
                  {resenas.slice(0, RESENAS_VISIBLES).map((resena) => (
                    <article key={resena.codigo} className={`card ${styles.resena}`}>
                      <div className={styles.autor}>
                        <AutorResena autorId={resena.autorId} nombre={autores[resena.autorId]}>
                          <small>{fecha(resena.fechaCreacion)}</small>
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
                  <small className={styles.nota}>Reseñas de clientes con un servicio finalizado.</small>
                </>
              )}
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

export default PerfilTrabajadorPage;