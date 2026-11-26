import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import { NOMBRES_ROL } from '../config';
import { Avatar } from './UserTable';
import styles from './Form.module.css';
import tarjeta from './RoleRequest.module.css';
import vista from './ProfileView.module.css';
import Icon from './Icon';

// Mismos límites que valida el back (StatusChangeDTO)
const MIN_MOTIVO = 10;
const MAX_MOTIVO = 500;

// Mismos íconos que las insignias de rol de ProfileHeader
const ICONO_ROL = { CONTRATANTE: 'user', TRABAJADOR: 'wrench', ADMIN: 'shield' };

const ESTADOS = {
  PENDING: { label: 'Pendiente', clase: tarjeta.pendiente },
  APPROVED: { label: 'Aprobada', clase: tarjeta.aprobada },
  REJECTED: { label: 'Rechazada', clase: tarjeta.rechazada },
};

// RF-13. Petición para quitar un rol; si está pendiente el admin la aprueba (quita el rol) o la rechaza con motivo
function RoleRequestCard({ peticion, mostrarUsuario = false, rolesUsuario, onResolver }) {
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
  // Los botones solo se activan cuando el motivo es válido y no hay envío en curso
  const bloqueado = enviando !== null || errorMotivo !== null;

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

  const titulo = (
    <div className={tarjeta.titulo}>
      <h3>Dejar de ser {NOMBRES_ROL[peticion.role]?.toLowerCase() ?? peticion.role}</h3>
      <span className={tarjeta.fecha}>Enviada el {new Date(peticion.createdAt).toLocaleString()}</span>
    </div>
  );

  return (
    <article className={`card ${tarjeta.tarjeta}`}>
      <div className={tarjeta.encabezado}>
        {/* En la bandeja se muestra quién la envió (foto y nombre); en el detalle del usuario ya se sabe */}
        {mostrarUsuario ? (
          <div className={tarjeta.usuario}>
            <Avatar userId={peticion.userId} nombre={peticion.userName} />
            <div>
              <div className={tarjeta.lineaNombre}>
                <strong className={tarjeta.nombre}>{peticion.userName}</strong>
                <Link to={`/admin/users/${peticion.userId}`} className={tarjeta.verPerfil}>(Ver perfil)</Link>
              </div>
              {rolesUsuario?.length > 0 && (
                <div className={`${vista.badges} ${tarjeta.roles}`}>
                  {rolesUsuario.map((rol, i) => (
                    <span key={rol} className={i > 0 ? vista.badgeNeutral : vista.badge}>
                      <Icon name={ICONO_ROL[rol] ?? 'user'} size={14} /> {NOMBRES_ROL[rol] ?? rol}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : titulo}
        <span className={`${tarjeta.estado} ${estado.clase}`}>{estado.label}</span>
      </div>
      {mostrarUsuario && (
        <>
          <hr className={tarjeta.separador} />
          {titulo}
        </>
      )}

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
            onBlur={() => recortado.length > 0 && setTocado(true)}
            maxLength={MAX_MOTIVO}
            rows={2}
          />
          <div className={styles.fieldFooter}>
            <div className={tarjeta.mensajes}>
              {tocado && errorMotivo && <p className={styles.fieldError}>{errorMotivo}</p>}
              {error && <p className={styles.fieldError}>{error}</p>}
            </div>
            <div className={tarjeta.acciones}>
              <Button type="button" variant="secondary" onClick={() => resolver('reject')} disabled={bloqueado}>
                {enviando === 'reject' ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button type="button" variant="danger" onClick={() => resolver('approve')} disabled={bloqueado}>
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