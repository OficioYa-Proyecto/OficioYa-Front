import { useSearchParams } from 'react-router-dom';
import RequestsView from '../../service/components/RequestsView';
import CalificarServicio from './CalificarServicio';

// Trabajos asignados al trabajador (los trae Service): aceptar, rechazar, cumplir,
// y calificar al contratante cuando el trabajo queda cumplido.
function MisServiciosPage() {
  const [searchParams] = useSearchParams();
  const calificar = searchParams.get('calificar');

  return (
    <RequestsView
      role="TRABAJADOR"
      eyebrow="Mis servicios"
      title="Mis trabajos"
      emptyText="Todavía no tienes trabajos asignados."
      renderExtra={(r) =>
        r.state === 'COMPLETED' ? (
          <CalificarServicio request={r} rol="TRABAJADOR" autoOpen={calificar === r.id} />
        ) : null
      }
    />
  );
}

export default MisServiciosPage;
