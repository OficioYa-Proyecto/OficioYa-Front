import RequestsView from '../../service/components/RequestsView';
import CalificarServicio from './CalificarServicio';

// Trabajos asignados al trabajador (los trae Service): aceptar, rechazar, cumplir,
// y calificar al contratante cuando el trabajo queda cumplido.
function MisServiciosPage() {
  return (
    <RequestsView
      role="TRABAJADOR"
      eyebrow="Mis servicios"
      title="Mis trabajos"
      emptyText="Todavía no tienes trabajos asignados."
      renderExtra={(request, autoOpen) =>
        request.state === 'COMPLETED' ? (
          <CalificarServicio request={request} rol="TRABAJADOR" autoOpen={autoOpen} />
        ) : null
      }
    />
  );
}

export default MisServiciosPage;
