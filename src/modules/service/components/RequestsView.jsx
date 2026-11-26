import ErrorMessage from '../../core/components/ErrorMessage';
import { getSession } from '../../core/lib/session';
import { formatMoney, unitName } from '../../workers/components/formats';
import { useConflictWorkers } from '../hooks/useConflictWorkers';
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

const normalizeText = (value) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// Tarifa y cercanía viven en el perfil de Worker; el nombre viene de Users (useUserNames).
function conflictDetails(request, profile, zones) {
  const trade = profile?.primaryTrade ?? profile?.secondaryTrades?.[0];
  const rate = trade?.approxRate == null
    ? 'Tarifa por acordar'
    : `${formatMoney(trade.approxRate)} ${unitName(trade.rateUnit)}`.trim();
  const coverage = (profile?.zoneIds ?? [])
    .map((zoneId) => zones.find((zone) => String(zone.id) === String(zoneId)))
    .filter(Boolean);
  const place = [request.neighborhood, request.locality].map(normalizeText).filter(Boolean);
  const sameNeighborhood = coverage.some((zone) => place.includes(normalizeText(zone.name)));
  const sameLocality = coverage.some((zone) => place.includes(normalizeText(zone.locality)));
  let proximity = 'Sin zona de cobertura';
  if (sameNeighborhood) proximity = 'En tu barrio';
  else if (sameLocality) proximity = 'En tu localidad';
  else if (coverage.length) proximity = `Cubre ${coverage.map((zone) => zone.name).join(', ')}`;
  return { rate, proximity };
}

function ConflictGroups({ requests, names, person, profiles, zones, onAction, focusRootId }) {
  const groups = new Map();
  requests
    .filter((request) => request?.state === 'CONFLICT' && request?.rootId)
    .forEach((request) => {
      if (!groups.has(request.rootId)) groups.set(request.rootId, []);
      groups.get(request.rootId).push(request);
    });

  return [...groups.entries()].map(([rootId, candidates]) => (
    <section
      key={rootId}
      className={`${styles.conflict} ${focusRootId === rootId ? styles.conflictFocus : ''}`}
    >
      <p className={styles.conflictEyebrow}>Disputa por resolver</p>
      <h2>{candidates.length} trabajadores aceptaron la misma solicitud</h2>
      <p className={styles.conflictHelp}>
        Elige cuál continúa con el servicio. Los demás quedarán cancelados automáticamente.
      </p>
      <div className={styles.conflictGrid}>
        {candidates.map((request) => {
          const { rate, proximity } = conflictDetails(request, profiles[request.workerId], zones);
          return (
            <article key={request.id} className={styles.candidate}>
              <strong>{names[request[person.idField]] || person.label}</strong>
              <span><b>Nombre trabajador:</b> {names[request.workerId] || 'Trabajador'}</span>
              <span><b>Tarifa:</b> {rate}</span>
              <span><b>Cercanía:</b> {proximity}</span>
              <span>{request.description || 'Sin descripción'}</span>
              {request.scheduledDateTime && (
                <span>
                  {new Date(request.scheduledDateTime).toLocaleString('es-CO', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              )}
              <button
                type="button"
                className={styles.chooseBtn}
                onClick={() => onAction('acceptConflict', request.id)}
              >
                Elegir esta
              </button>
            </article>
          );
        })}
      </div>
    </section>
  ));
}

function RequestsList({ role, eyebrow, title, emptyText, renderExtra, focusRootId }) {
  const { requests, loading, error, act } = useRequests(role);
  const person = PERSON[role];
  const names = useUserNames(requests.map((request) => request[person.idField]));
  const { profiles, zones } = useConflictWorkers(requests);
  const conflictRoots = new Set(
    requests.filter((r) => r?.state === 'CONFLICT' && r?.rootId).map((r) => r.rootId),
  );
  // Cuando ya se eligió un trabajador, los demás quedan cancelados y no deben
  // seguir apareciendo en Mis solicitudes.
  const resolvedConflictRoots = new Set(
    requests
      .filter((r) => r?.state === 'CANCELED' && r?.rootId
        && requests.some((s) => s?.rootId === r.rootId && s?.state === 'ACCEPTED'))
      .map((r) => r.rootId),
  );

  // Una solicitud enviada a varios trabajadores comparte rootId; en la lista del
  // contratante se muestra una sola tarjeta por grupo para evitar duplicados.
  const representativeIds = new Set();
  if (role === 'CONTRATANTE') {
    const groups = new Map();
    requests.forEach((request) => {
      const key = request?.rootId
        ?? `${request?.description ?? ''}|${request?.scheduledDateTime ?? ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(request);
    });
    const priority = {
      ACCEPTED: 5,
      PENDING: 3,
      COMPLETED: 2,
      REJECTED: 1,
      EXPIRED: 1,
      CANCELED: 0,
    };
    groups.forEach((group) => {
      const chosen = group.reduce((best, current) => {
        if (!best) return current;
        const bestPriority = priority[best?.state] ?? 0;
        const currentPriority = priority[current?.state] ?? 0;
        return currentPriority > bestPriority ? current : best;
      }, null);
      if (chosen?.id) representativeIds.add(chosen.id);
    });
  }

  const visible = role === 'CONTRATANTE'
    ? requests.filter((r) => {
        // Todo lo que pertenece a una disputa se muestra únicamente en el bloque
        // "Disputa por resolver", nunca como tarjetas sueltas.
        if (r?.rootId && conflictRoots.has(r.rootId)) return false;
        if (r?.state === 'CANCELED' && resolvedConflictRoots.has(r.rootId)) return false;
        if (!representativeIds.has(r.id)) return false;
        return true;
      })
    : requests;

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
      {!loading && role === 'CONTRATANTE' && (
        <ConflictGroups
          requests={requests}
          names={names}
          person={person}
          profiles={profiles}
          zones={zones}
          onAction={act}
          focusRootId={focusRootId}
        />
      )}
      {visible.map((request) => (
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
function RequestsView({ role, eyebrow, title, emptyText, renderExtra, focusRootId }) {
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
          focusRootId={focusRootId}
        />
      ) : (
        <ErrorMessage error="No tienes permiso para ver esta página." />
      )}
    </div>
  );
}

export default RequestsView;
