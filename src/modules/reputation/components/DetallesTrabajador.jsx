import { useEffect, useState } from 'react';
import { dinero, unidad } from '../formatos';
import * as reputationService from '../services/reputationService';
import Skeleton from '../../users/components/Skeleton';
import styles from './DetallesTrabajador.module.css';

const DIAS = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miércoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sábados',
  SUNDAY: 'domingos',
};
const ORDEN_DIAS = Object.keys(DIAS);

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

// Worker a veces guarda la URL de la galería con el dominio repetido. Si es del servicio de imágenes,
// se arma de nuevo con su id; si es una URL externa, se deja igual.
function urlImagen(url) {
  const id = typeof url === 'string' ? url.match(/\/api\/v1\/images\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1] : null;
  return id ? `${API_ORIGIN}/api/v1/images/${id}` : url;
}

function hoyISO() {
  const hoy = new Date();
  const dosCifras = (n) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dosCifras(hoy.getMonth() + 1)}-${dosCifras(hoy.getDate())}`;
}

function fechaCorta(valor) {
  // Las fechas de Worker vienen como "AAAA-MM-DD"; se leen en hora local para no correr el día.
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Franjas semanales primero (por día), luego las fechas puntuales que aún no pasaron. */
function horario(franjas) {
  const hoy = hoyISO();
  const semanales = franjas
    .filter((f) => f.tipo === 'RECURRING' && f.dia && (!f.hasta || f.hasta >= hoy))
    .sort((a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia) || a.inicio.localeCompare(b.inicio))
    .map((f) => ({ tipo: 'Cada semana', cuando: `Todos los ${DIAS[f.dia]}`, horas: `${f.inicio} – ${f.fin}` }));
  const fijas = franjas
    .filter((f) => f.tipo === 'FIXED' && f.desde && f.desde >= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde) || a.inicio.localeCompare(b.inicio))
    .map((f) => ({ tipo: 'Una fecha', cuando: fechaCorta(f.desde), horas: `${f.inicio} – ${f.fin}` }));
  return [...semanales, ...fijas];
}

/** Barrios del trabajador agrupados por localidad, en orden alfabético. */
function useLocalidades(zonaIds, token) {
  // null mientras llegan los barrios, para no decir "Aún no indica sus barrios" antes de tiempo.
  const [zonas, setZonas] = useState(null);

  useEffect(() => {
    let vigente = true;
    reputationService
      .listarZonas(token)
      .then((lista) => vigente && setZonas(Array.isArray(lista) ? lista : []))
      .catch(() => vigente && setZonas([]));
    return () => {
      vigente = false;
    };
  }, [token]);

  if (zonas === null) {
    return null;
  }
  const grupos = new Map();
  zonas
    .filter((zona) => zonaIds.includes(zona.id))
    .forEach((zona) => {
      const localidad = zona.locality || 'Otras';
      grupos.set(localidad, [...(grupos.get(localidad) ?? []), zona.name]);
    });
  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([localidad, barrios]) => ({ localidad, barrios: barrios.sort((a, b) => a.localeCompare(b, 'es')) }));
}

function Pin() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function Candado() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/** Localidades donde trabaja, con sus barrios. */
export function Cobertura({ cuenta, token }) {
  const localidades = useLocalidades(cuenta?.zonaIds ?? [], token);
  return (
    <section className={`card ${styles.tarjeta}`}>
      <h2>Cobertura</h2>
      {localidades === null && <Skeleton lines={1} />}
      {localidades?.length === 0 && <p className={styles.vacio}>Aún no indica sus barrios.</p>}
      {localidades?.length > 0 && (
        <ul className={styles.localidades}>
          {localidades.map((grupo) => (
            <li key={grupo.localidad}>
              <span className={styles.chip}>
                <Pin /> {grupo.localidad}
              </span>
              <small>{grupo.barrios.join(', ')}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** El perfil público no muestra datos de contacto: se contrata desde OficioYa. */
export function Contacto() {
  return (
    <section className={`card ${styles.tarjeta} ${styles.contacto}`}>
      <h2>Contacto</h2>
      <p className={styles.privacidad}>
        <Candado />
        <span>Por privacidad, los datos de contacto del trabajador no se muestran en su perfil público.</span>
      </p>
    </section>
  );
}

export function OficiosYTarifas({ cuenta }) {
  if (!cuenta?.tarifas?.length) {
    return null;
  }
  return (
    <section className={`card ${styles.tarjeta}`}>
      <h2>Oficios y tarifas</h2>
      <ul className={styles.tarifas}>
        {cuenta.tarifas.map((item, indice) => (
          <li key={item.nombre}>
            <div>
              <strong>{item.nombre}</strong>
              {indice === 0 && <span className={styles.principal}>Principal</span>}
            </div>
            <span>
              {item.tarifa == null ? (
                'Por acordar'
              ) : (
                <>
                  <strong>{dinero(item.tarifa)}</strong> <small>{unidad(item.unidad)}</small>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.vacio}>Las tarifas son aproximadas y pueden variar según el trabajo.</p>
    </section>
  );
}

export function Disponibilidad({ cuenta }) {
  if (!cuenta) {
    return null;
  }
  const franjas = horario(cuenta.franjas ?? []);
  return (
    <section className={`card ${styles.tarjeta}`}>
      <h2>Disponibilidad</h2>
      <p className={cuenta.disponibleAhora ? styles.disponible : styles.noDisponible}>
        <span aria-hidden="true" /> {cuenta.disponibleAhora ? 'Disponible ahora' : 'No disponible ahora'}
      </p>
      {franjas.length === 0 ? (
        <p className={styles.vacio}>Aún no publica su horario. Puedes proponer uno al contratarlo.</p>
      ) : (
        <ul className={styles.franjas}>
          {franjas.map((franja) => (
            <li key={`${franja.cuando}-${franja.horas}`}>
              <span className={styles.tipoFranja}>{franja.tipo}</span>
              <div>
                <strong>{franja.cuando}</strong>
                <small>{franja.horas}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Fotos de trabajos realizados que el trabajador subió a su galería. */
export function TrabajosRealizados({ fotos }) {
  if (!fotos?.length) {
    return null;
  }
  return (
    <section className={`card ${styles.tarjeta}`}>
      <h2>Trabajos realizados</h2>
      <ul className={styles.galeria}>
        {fotos.map((foto) => (
          <li key={foto.id}>
            <img src={urlImagen(foto.url)} alt={foto.descripcion || 'Trabajo realizado'} loading="lazy" />
            <span>{foto.descripcion || 'Sin descripción'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}