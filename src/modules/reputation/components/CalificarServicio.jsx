import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import { getSession } from '../../core/lib/session';
import CalificarModal from './CalificarModal';
import styles from './CalificarServicio.module.css';

const CLAVE = 'oy_calificados_';

// Reputation no tiene un endpoint para saber qué servicios ya califiqué,
// así que se recuerdan en este navegador, por usuario.
function leerCalificados(userId) {
  try {
    const guardados = JSON.parse(localStorage.getItem(CLAVE + userId) ?? '[]');
    return Array.isArray(guardados) ? guardados : [];
  } catch {
    return [];
  }
}

function guardarCalificado(userId, solicitudId) {
  try {
    localStorage.setItem(CLAVE + userId, JSON.stringify([...leerCalificados(userId), solicitudId]));
  } catch {
    // sin almacenamiento disponible: se ignora
  }
}

// Botón "Calificar" de un servicio cumplido. rol = el rol de quien califica:
// el contratante califica al trabajador y el trabajador al contratante.
// La reseña se envía a Reputation con el id de la solicitud (el mismo que Service le avisó al cumplirse).
function CalificarServicio({ request, rol, autoOpen = false }) {
  const sesion = getSession();
  const [calificado, setCalificado] = useState(() =>
    leerCalificados(sesion?.userId).includes(request.id),
  );
  const [abierto, setAbierto] = useState(autoOpen && !calificado);

  function alCalificar() {
    guardarCalificado(sesion?.userId, request.id);
    setCalificado(true);
    setAbierto(false);
    window.dispatchEvent(
      new CustomEvent('oy-request-rated', { detail: { id: request.id, rol } }),
    );
  }

  if (calificado) {
    return (
      <>
        <span className={styles.calificado}>Calificado</span>
        {rol === 'CONTRATANTE' && request.workerId && (
          <Link to={`/trabajadores/${request.workerId}`} className={styles.enlace}>
            Ver perfil
          </Link>
        )}
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setAbierto(true)}>Calificar</Button>
      {abierto && (
        <CalificarModal
          servicio={{
            solicitudId: request.id,
            contraparte: rol === 'CONTRATANTE' ? 'el trabajador' : 'el contratante',
          }}
          token={sesion?.token}
          alCalificar={alCalificar}
          alCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

export default CalificarServicio;
