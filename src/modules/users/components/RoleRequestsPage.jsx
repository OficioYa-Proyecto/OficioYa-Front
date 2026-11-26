import { useEffect, useMemo, useState } from 'react';
import Button from '../../core/design-system/Button';
import { usePeticionesRol } from '../hooks/useRoleRequests';
import { listUsers } from '../services/adminUserService';
import RoleRequestCard from './RoleRequestCard';
import Skeleton from './Skeleton';
import vista from './ProfileView.module.css';
import tarjeta from './RoleRequest.module.css';
import reg from '../../auth/pages/RegisterPage.module.css';

const FILTROS = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
  { id: '', label: 'Todas' },
];

// RF-13. Bandeja del administrador con las peticiones para quitar un rol
function RoleRequestsPage() {
  const [filtro, setFiltro] = useState('PENDING');
  // Se cargan todas una sola vez y se filtran en memoria: cambiar de filtro es instantáneo
  const { peticiones: todas, loading, error, resolver } = usePeticionesRol();
  // Roles actuales de cada usuario (la petición no los trae); se recargan al resolver una
  const [rolesPorUsuario, setRolesPorUsuario] = useState({});
  const [versionRoles, setVersionRoles] = useState(0);

  useEffect(() => {
    let vigente = true;
    listUsers()
      .then((usuarios) => {
        if (!vigente) return;
        setRolesPorUsuario(Object.fromEntries((usuarios ?? []).map((u) => [u.id, u.roles ?? []])));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [versionRoles]);

  async function resolverYRecargar(...args) {
    const actualizada = await resolver(...args);
    setVersionRoles((v) => v + 1);
    return actualizada;
  }

  const peticiones = useMemo(
    () => (filtro ? todas.filter((p) => p.status === filtro) : todas),
    [todas, filtro],
  );

  return (
    <section className={vista.page}>
      <div className={vista.top}>
        <div>
          <span className={reg.eyebrow}>Administración</span>
          <h1 className={reg.heroTitle}>
            <span className={reg.brandHighlight}>Peticiones</span>
          </h1>
          <p className={reg.heroSub}>Los usuarios piden dejar de ser trabajadores o contratantes; solo tú puedes aprobarlo.</p>
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
            <RoleRequestCard
              key={p.id}
              peticion={p}
              mostrarUsuario
              rolesUsuario={rolesPorUsuario[p.userId]}
              onResolver={resolverYRecargar}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default RoleRequestsPage;