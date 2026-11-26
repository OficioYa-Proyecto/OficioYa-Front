import { useEffect, useState } from 'react';
import * as reputationService from '../services/reputationService';
import styles from './DetallesTrabajador.module.css';

const DIAS = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};
const ORDEN_DIAS = Object.keys(DIAS);
const UNIDADES = { PER_HOUR: 'por hora', PER_DAY: 'por día', PER_JOB: 'por trabajo' };

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

// Worker a veces guarda la URL de la galería con el dominio repetido. Si es del servicio de imágenes,
// se arma de nuevo con su id; si es una URL externa, se deja igual.
function urlImagen(url) {
  const id = typeof url === 'string' ? url.match(/\/api\/v1\/images\/([0-9a-f-]{36})(?:[/?#]|$)/i)?.[1] : null;
  return id ? `${API_ORIGIN}/api/v1/images/${id}` : url;
}

function dinero(valor) {
  return `$${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function hoyISO() {
  const hoy = new Date();
  const dosCifras = (n) => String(n).padStart(2, '0');
  return `${hoy.getFullYear()}-${dosCifras(hoy.getMonth() + 1)}-${dosCifras(hoy.getDate())}`;
}

function fechaCorta(valor) {
  // Las fechas de Worker vienen como "AAAA-MM-DD"; se leen en hora local para no correr el día.
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Franjas semanales primero (por día), luego las fechas puntuales que aún no pasaron. */
function horario(franjas) {
  const hoy = hoyISO();
  const semanales = franjas
    .filter((f) => f.tipo === 'RECURRING' && f.dia && (!f.hasta || f.hasta >= hoy))
    .sort((a, b) => ORDEN_DIAS.indexOf(a.dia) - ORDEN_DIAS.indexOf(b.dia) || a.inicio.localeCompare(b.inicio))
    .map((f) => ({ cuando: DIAS[f.dia], horas: `${f.inicio} – ${f.fin}` }));
  const fijas = franjas
    .filter((f) => f.tipo === 'FIXED' && f.desde && f.desde >= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde) || a.inicio.localeCompare(b.inicio))
    .map((f) => ({ cuando: fechaCorta(f.desde), horas: `${f.inicio} – ${f.fin}` }));
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

function Seccion({ titulo, children }) {
  return (
    <section className={styles.seccion}>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

/** Lo que el contratante necesita saber antes de contratar: disponibilidad, tarifas, dónde y cuándo trabaja. */
export function DetallesTrabajador({ cuenta, token }) {
  const localidades = useLocalidades(cuenta?.zonaIds ?? [], token);
  if (!cuenta) {
    return null;
  }
  const franjas = horario(cuenta.franjas ?? []);

  return (
    <div className={styles.detalles}>
      <p className={cuenta.disponibleAhora ? styles.disponible : styles.noDisponible}>
        <span aria-hidden="true" /> {cuenta.disponibleAhora ? 'Disponible ahora' : 'No disponible ahora'}
      </p>

      {cuenta.tarifas?.length > 0 && (
        <Seccion titulo="Oficios y tarifas">
          <ul className={styles.lista}>
            {cuenta.tarifas.map((item) => (
              <li key={item.nombre}>
                <span>{item.nombre}</span>
                <strong>
                  {item.tarifa == null ? 'Por acordar' : `${dinero(item.tarifa)} ${UNIDADES[item.unidad] ?? ''}`}
                </strong>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Dónde trabaja">
        {localidades === null && <p className={styles.vacio}>Cargando barrios…</p>}
        {localidades?.length === 0 && <p className={styles.vacio}>Aún no indica sus barrios.</p>}
        {localidades?.length > 0 && (
          <ul className={styles.localidades}>
            {localidades.map((grupo) => (
              <li key={grupo.localidad}>
                <strong>{grupo.localidad}</strong>
                <span>{grupo.barrios.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Seccion titulo="Horario">
        {franjas.length === 0 ? (
          <p className={styles.vacio}>Aún no publica su horario. Puedes proponer uno al contratarlo.</p>
        ) : (
          <ul className={styles.lista}>
            {franjas.map((franja) => (
              <li key={`${franja.cuando}-${franja.horas}`}>
                <span>{franja.cuando}</span>
                <strong>{franja.horas}</strong>
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </div>
  );
}

/** Fotos de trabajos realizados que el trabajador subió a su galería. */
export function TrabajosRealizados({ fotos }) {
  if (!fotos?.length) {
    return null;
  }
  return (
    <div className={styles.galeria}>
      <div>
        <span className="eyebrow">Galería</span>
        <h2>Trabajos realizados</h2>
      </div>
      <ul>
        {fotos.map((foto) => (
          <li key={foto.id}>
            <img src={urlImagen(foto.url)} alt={foto.descripcion || 'Trabajo realizado'} loading="lazy" />
            {foto.descripcion && <span>{foto.descripcion}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
