import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import { NOMBRES_ROL } from '../config';
import styles from './Form.module.css';
import tarjeta from './RoleRequest.module.css';

// Mismos límites que valida el back (StatusChangeDTO)
const MIN_MOTIVO = 10;
const MAX_MOTIVO = 500;

const ESTADOS = {
  PENDING: { label: 'Pendiente', clase: tarjeta.pendiente },
  APPROVED: { label: 'Aprobada', clase: tarjeta.aprobada },
  REJECTED: { label: 'Rechazada', clase: tarjeta.rechazada },
};

// RF-13. Petición para quitar un rol; si está pendiente el admin la aprueba (quita el rol) o la rechaza con motivo
function RoleRequestCard({ peticion, mostrarUsuario = false, onResolver }) {
  const [motivo, setMotivo] = useState('');
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const [error, setError] = useState(null);

  const estado = ESTADOS[peticion.status] ?? ESTADOS.PENDING;
  const pendiente = peticion.status === 'PENDING';
  const recortado = motivo.trim();
  const errorMotivo = recortado.length < MIN_MOTIVO
    ? `El motivo debe tener al menos ${MIN_MOTIVO} caracteres`
    : null;

  async function resolver(accion) {
    setTocado(true);
    if (errorMotivo) return;
    setEnviando(accion);
    setError(null);
    try {
      await onResolver(peticion.id, accion, recortado);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <article className={`card ${tarjeta.tarjeta}`}>
      <div className={tarjeta.encabezado}>
        <div>
          {mostrarUsuario && (
            <Link to={`/admin/users/${peticion.userId}`} className={tarjeta.usuario}>{peticion.userName}</Link>
          )}
          <strong>Dejar de ser {NOMBRES_ROL[peticion.role]?.toLowerCase() ?? peticion.role}</strong>
          <span className={tarjeta.fecha}>Enviada el {new Date(peticion.createdAt).toLocaleString()}</span>
        </div>
        <span className={`${tarjeta.estado} ${estado.clase}`}>{estado.label}</span>
      </div>

      <p className={tarjeta.razon}><strong>Razón del usuario:</strong> {peticion.reason}</p>
      {peticion.adminReason && (
        <p className={tarjeta.razon}>
          <strong>Motivo del administrador:</strong> {peticion.adminReason}
          {peticion.resolvedAt && <span className={tarjeta.fecha}> ({new Date(peticion.resolvedAt).toLocaleString()})</span>}
        </p>
      )}

      {pendiente && onResolver && (
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor={`motivo-${peticion.id}`} className={styles.label}>
              Motivo de la decisión<span className={styles.required}>*</span>
            </label>
            <span className={styles.counter}>{recortado.length}/{MAX_MOTIVO} (mínimo {MIN_MOTIVO})</span>
          </div>
          <textarea
            id={`motivo-${peticion.id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            onBlur={() => setTocado(true)}
            maxLength={MAX_MOTIVO}
            rows={2}
          />
          <div className={styles.fieldFooter}>
            <div>
              {tocado && errorMotivo && <p className={styles.fieldError}>{errorMotivo}</p>}
              {error && <p className={styles.fieldError}>{error}</p>}
            </div>
            <div className={tarjeta.acciones}>
              <Button type="button" variant="outline" onClick={() => resolver('reject')} disabled={enviando !== null}>
                {enviando === 'reject' ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button type="button" variant="danger" onClick={() => resolver('approve')} disabled={enviando !== null}>
                {enviando === 'approve' ? 'Aprobando...' : 'Aprobar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default RoleRequestCard;