import RequiereRol from './components/RequiereRol';
import MisServiciosPage from './components/MisServiciosPage';
import ModeracionPage from './components/ModeracionPage';
import PerfilTrabajadorPage from './components/PerfilTrabajadorPage';

export const routes = [
  {
    path: '/mis-servicios',
    element: (
      <RequiereRol roles={['TRABAJADOR']}>
        <MisServiciosPage />
      </RequiereRol>
    ),
  },
  {
    path: '/trabajadores/:id',
    element: (
      <RequiereRol>
        <PerfilTrabajadorPage />
      </RequiereRol>
    ),
  },
  {
    path: '/admin/moderacion',
    element: (
      <RequiereRol roles={['ADMIN']}>
        <ModeracionPage />
      </RequiereRol>
    ),
  },
];

export const navLinks = [
  { label: 'Mis Servicios', to: '/mis-servicios', roles: ['TRABAJADOR'] },
  { label: 'Moderación', to: '/admin/moderacion', roles: ['ADMIN'] },
];
