import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import estilosBoton from '../../core/design-system/Button.module.css';
import { getToken } from '../../core/lib/session';
import { decimal } from '../formatos';
import * as reputationService from '../services/reputationService';
import Estrellas from './Estrellas';
import styles from './MisCalificaciones.module.css';

// Reputation guarda ambas calificaciones con la cuenta de Users (el mismo id del perfil).
const TIPOS = {
  CONTRATANTE: {
    titulo: 'Como contratante',
    consultar: reputationService.obtenerReputacionContratante,
    // Perfil público donde se leen todas las reseñas (los dos aceptan el id de la cuenta).
    ruta: (usuarioId) => `/contratantes/${usuarioId}`,
    promedio: (datos) => datos.promedioCalificaciones,
    quienes: 'trabajadores',
    sinResenas: 'Aún no tienes calificaciones. Los trabajadores te califican al terminar un servicio.',
  },
  TRABAJADOR: {
    titulo: 'Como trabajador',
    consultar: reputationService.obtenerReputacion,
    ruta: (usuarioId) => `/trabajadores/${usuarioId}#resenas`,
    // La reputación del trabajador ya descuenta las penalizaciones (por ejemplo, cancelaciones tardías).
    promedio: (datos) => datos.reputacion,
    quienes: 'clientes',
    sinResenas: 'Aún no tienes calificaciones. Los clientes te califican al terminar un servicio.',
  },
};

function useCalificacion(rol, usuarioId) {
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    if (!usuarioId) {
      return undefined;
    }
    let vigente = true;
    TIPOS[rol]
      .consultar(usuarioId, getToken())
      .then((datos) => vigente && setRespuesta({ usuarioId, datos }))
      .catch(() => vigente && setRespuesta({ usuarioId, datos: null }));
    return () => {
      vigente = false;
    };
  }, [rol, usuarioId]);

  const cargando = respuesta?.usuarioId !== usuarioId;
  return { cargando, datos: cargando ? null : respuesta.datos };
}

function Calificacion({ rol, usuarioId }) {
  const { cargando, datos } = useCalificacion(rol, usuarioId);
  const tipo = TIPOS[rol];
  if (!cargando && !datos) {
    // Si Reputation no responde, esa calificación simplemente no se muestra.
    return null;
  }
  const total = datos?.totalResenas ?? 0;
  const promedio = total > 0 ? tipo.promedio(datos) : 0;

  return (
    <div className={styles.calificacion} aria-busy={cargando}>
      <h3>{tipo.titulo}</h3>
      {cargando ? (
        <p className={styles.nota}>Cargando calificación…</p>
      ) : (
        <>
          <div className={styles.valor}>
            <strong>{total > 0 ? decimal(promedio) : '—'}</strong>
            <div>
              <Estrellas valor={promedio} />
              <p>
                {total} {total === 1 ? 'reseña' : 'reseñas'} de {tipo.quienes}
              </p>
            </div>
          </div>
          {total === 0 && <p className={styles.nota}>{tipo.sinResenas}</p>}
          {total > 0 && (
            <Link
              to={tipo.ruta(usuarioId)}
              className={`${estilosBoton.button} ${estilosBoton.secondary} ${styles.verResenas}`}
            >
              Ver {total === 1 ? 'la reseña' : `las ${total} reseñas`}
            </Link>
          )}
          {rol === 'TRABAJADOR' && datos.estado === 'PAUSADO' && (
            <p className={styles.aviso}>Tu perfil está pausado por baja reputación: no recibes nuevas solicitudes.</p>
          )}
        </>
      )}
    </div>
  );
}

/** "Mis calificaciones" en Mi perfil: la de contratante, la de trabajador o ambas, según los roles de la cuenta. */
function MisCalificaciones({ usuarioId, roles = [] }) {
  const visibles = ['CONTRATANTE', 'TRABAJADOR'].filter((rol) => roles.includes(rol));
  if (!usuarioId || visibles.length === 0) {
    return null;
  }
  return (
    <section className={`card ${styles.tarjeta}`}>
      <h2>Mis calificaciones</h2>
      {visibles.map((rol) => (
        <Calificacion key={rol} rol={rol} usuarioId={usuarioId} />
      ))}
    </section>
  );
}

export default MisCalificaciones;
