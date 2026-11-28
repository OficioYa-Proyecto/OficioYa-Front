import { Link, useSearchParams } from 'react-router-dom';
import RequestsView from '../../service/components/RequestsView';
import CalificarServicio from './CalificarServicio';
import styles from './MisServiciosPage.module.css';

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
      // Debajo del estado: el trabajador puede revisar al contratante antes de aceptar.
      // En los cumplidos no hace falta, porque "Ver perfil" ya sale junto a Calificar.
      renderAside={(r, nombre) =>
        r.state !== 'COMPLETED' && r.contractorId ? (
          <Link
            to={`/contratantes/${r.contractorId}`}
            state={nombre ? { nombre } : undefined}
            className={styles.verPerfil}
          >
            Ver perfil
          </Link>
        ) : null
      }
      renderExtra={(r) =>
        r.state === 'COMPLETED' ? (
          <CalificarServicio request={r} rol="TRABAJADOR" autoOpen={calificar === r.id} />
        ) : null
      }
    />
  );
}

export default MisServiciosPage;
