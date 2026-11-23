import CalificarServicio from '../../reputation/components/CalificarServicio';
import RequestsView from './RequestsView';

// Solicitudes que hice como contratante: mismas tarjetas que "Mis servicios" del trabajador.
function MisSolicitudesPage() {
  return (
    <RequestsView
      role="CONTRATANTE"
      eyebrow="Mis solicitudes"
      title="Solicitudes de servicio"
      emptyText="No tienes solicitudes todavía."
      renderExtra={(request) =>
        request.state === 'COMPLETED' ? (
          <CalificarServicio request={request} rol="CONTRATANTE" />
        ) : null
      }
    />
  );
}

export default MisSolicitudesPage;
