import { useState } from 'react';
import Button from '../../core/design-system/Button';
import { usePeticionesRol } from '../hooks/useRoleRequests';
import RoleRequestCard from './RoleRequestCard';
import Skeleton from './Skeleton';
import vista from './ProfileView.module.css';
import tarjeta from './RoleRequest.module.css';

const FILTROS = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
  { id: '', label: 'Todas' },
];

// RF-13. Bandeja del administrador con las peticiones para quitar un rol
function RoleRequestsPage() {
  const [filtro, setFiltro] = useState('PENDING');
  const { peticiones, loading, error, resolver } = usePeticionesRol({ status: filtro || undefined });

  return (
    <section className={vista.page}>
      <div className={vista.top}>
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Peticiones para dejar de ser trabajador o contratante</h1>
          <p>Los usuarios piden dejar de ser trabajadores o contratantes; solo tú puedes aprobarlo.</p>
        </div>
      </div>

      <div className={tarjeta.filtros}>
        {FILTROS.map((f) => (
          <Button
            key={f.id || 'TODAS'}
            type="button"
            variant={filtro === f.id ? 'primary' : 'secondary'}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading || error ? (
        <div className="card"><Skeleton lines={3} error={error} /></div>
      ) : peticiones.length === 0 ? (
        <div className="card"><p>No hay peticiones en esta categoría.</p></div>
      ) : (
        <div className={tarjeta.lista}>
          {peticiones.map((p) => (
            <RoleRequestCard key={p.id} peticion={p} mostrarUsuario onResolver={resolver} />
          ))}
        </div>
      )}
    </section>
  );
}

export default RoleRequestsPage;