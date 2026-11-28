import { useSearchParams } from 'react-router-dom';
import Skeleton from '../../users/components/Skeleton';
import { useRequests } from '../hooks/useRequests';
import CalificarServicio from '../../reputation/components/CalificarServicio';
import RequestsView from './RequestsView';
import styles from './RequestsView.module.css';

// El enlace del correo puede venir de cualquiera de los dos roles: se busca la
// solicitud en ambos listados y se abre directamente la calificación.
function CalificarDesdeEnlace({ solicitudId }) {
  const trabajador = useRequests('TRABAJADOR');
  const contratante = useRequests('CONTRATANTE');
  const cargando = trabajador.loading || contratante.loading;

  const items = [
    ...trabajador.requests.map((request) => ({ request, role: 'TRABAJADOR' })),
    ...contratante.requests.map((request) => ({ request, role: 'CONTRATANTE' })),
  ];
  const encontrada = items.find(
    ({ request }) => request.id === solicitudId && request.state === 'COMPLETED',
  );

  if (cargando) {
    return (
      <section className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Mis solicitudes</p>
            <h1>Calificar <span className={styles.accent}>servicio</span></h1>
          </div>
        </header>
        <div className="card"><Skeleton lines={3} /></div>
      </section>
    );
  }

  if (!encontrada) {
    return (
      <RequestsView
        role="CONTRATANTE"
        eyebrow="Mis solicitudes"
        title="Solicitudes de servicio"
        emptyText="No tienes solicitudes todavía."
      />
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Mis solicitudes</p>
          <h1>Calificar <span className={styles.accent}>servicio</span></h1>
          <span className={styles.role}>{encontrada.role === 'TRABAJADOR' ? 'Trabajador' : 'Contratante'}</span>
        </div>
      </header>
      <CalificarServicio request={encontrada.request} rol={encontrada.role} autoOpen />
    </section>
  );
}

// Solicitudes que hice como contratante: mismas tarjetas que "Mis servicios" del trabajador.
function MisSolicitudesPage() {
  const [searchParams] = useSearchParams();
  const calificar = searchParams.get('calificar');
  const conflict = searchParams.get('conflict');

  if (calificar) return <CalificarDesdeEnlace solicitudId={calificar} />;

  return (
    <RequestsView
      role="CONTRATANTE"
      eyebrow="Mis solicitudes"
      title="Solicitudes de servicio"
      emptyText="No tienes solicitudes todavía."
      focusRootId={conflict}
      renderExtra={(request) =>
        request.state === 'COMPLETED' ? (
          <CalificarServicio request={request} rol="CONTRATANTE" />
        ) : null
      }
    />
  );
}

export default MisSolicitudesPage;