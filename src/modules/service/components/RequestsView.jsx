import ErrorMessage from '../../core/components/ErrorMessage';
import { getSession } from '../../core/lib/session';
import { useRequests } from '../hooks/useRequests';
import { useUserNames } from '../hooks/useUserNames';
import { actionsFor } from '../requestActions';
import RequestCard from './RequestCard';
import styles from './RequestsView.module.css';

const ROLE_LABELS = { TRABAJADOR: 'Trabajador', CONTRATANTE: 'Contratante' };

// De quién se muestra el nombre en la tarjeta: el contratante ve al trabajador y viceversa.
const PERSON = {
  CONTRATANTE: { label: 'Trabajador', idField: 'workerId' },
  TRABAJADOR: { label: 'Contratante', idField: 'contractorId' },
};

const normalizeRole = (role) => String(role).toUpperCase().replace('ROLE_', '');

function RequestsList({ role, eyebrow, title, emptyText, renderExtra }) {
  const { requests, loading, error, act } = useRequests(role);
  const person = PERSON[role];
  const names = useUserNames(requests.map((request) => request[person.idField]));

  return (
    <section className={styles.list}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <span className={styles.role}>{ROLE_LABELS[role] ?? role}</span>
        </div>
      </header>
      <ErrorMessage error={error} />
      {loading && <p>Cargando…</p>}
      {!loading && !error && requests.length === 0 && <p className={styles.empty}>{emptyText}</p>}
      {requests.map((request) => (
        <RequestCard
          key={request.id}
          request={request}
          actions={actionsFor(role, request.state)}
          onAction={act}
          personLabel={person.label}
          personName={names[request[person.idField]] ?? ''}
          extra={renderExtra ? renderExtra(request) : null}
        />
      ))}
    </section>
  );
}

// Lista de solicitudes de un rol, con la misma tarjeta para contratante y trabajador.
// El token sale de la sesión del login (httpClient lo envía solo); aquí solo se revisa el rol
// para decidir qué mostrar: la seguridad real la aplica el back.
// renderExtra(request) permite a cada página agregar algo a la tarjeta (por ejemplo, calificar).
function RequestsView({ role, eyebrow, title, emptyText, renderExtra }) {
  const roles = (getSession()?.roles ?? []).map(normalizeRole);

  return (
    <div className={styles.page}>
      {roles.includes(role) ? (
        <RequestsList
          role={role}
          eyebrow={eyebrow}
          title={title}
          emptyText={emptyText}
          renderExtra={renderExtra}
        />
      ) : (
        <ErrorMessage error="No tienes permiso para ver esta página." />
      )}
    </div>
  );
}

export default RequestsView;
