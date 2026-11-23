// Token de acceso (JWT) con el formato de Identity.
// Se genera con scripts/generar-token.js, que lo guarda en .env.local
export const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN ?? '';

// Mismas reglas que valida el back (PhoneDTO y UserService): celular de 10 dígitos que empieza por 3
export const MAX_TELEFONOS = 3;

export function validarTelefono(numero) {
  if (numero.trim() === '') {
    return 'Escribe el número';
  }
  if (!/^[0-9]*$/.test(numero)) {
    return 'Solo se permiten números';
  }
  if (!/^3[0-9]{9}$/.test(numero)) {
    return 'Ingrese un teléfono válido';
  }
  return null;
}

// Botón y mensaje para cada rol que el usuario todavía no tiene
export const ROLES_AGREGABLES = {
  TRABAJADOR: {
    boton: 'Quiero ser trabajador',
    descripcion: 'Ofrece tus servicios y aparece en las búsquedas de quienes necesitan un oficio.',
    agregado: 'Ya eres trabajador.',
    detalle: 'Inicia sesión de nuevo para completar tu perfil de trabajador.',
  },
  CONTRATANTE: {
    boton: 'Quiero ser contratante',
    descripcion: 'Solicita servicios a trabajadores con esta misma cuenta.',
    agregado: 'Ya eres contratante.',
    detalle: 'Ya puedes solicitar servicios con esta misma cuenta.',
  },
};

// RF-13. Botón y formulario para pedirle al administrador que quite un rol cuando la cuenta tiene ambos
export const ROLES_QUITABLES = {
  TRABAJADOR: {
    boton: 'Quiero dejar de ser trabajador',
    descripcion: 'Envía una petición al administrador. Si la aprueba, tu perfil de trabajador se pausa y deja de aparecer en búsquedas.',
    aviso: 'No puedes tener solicitudes activas como trabajador.',
    titulo: '¿Dejar de ser trabajador?',
    texto: 'Cuéntanos por qué deseas dejar de ser trabajador, un administrador revisará tu petición.',
    nombre: 'trabajador',
  },
  CONTRATANTE: {
    boton: 'Quiero dejar de ser contratante',
    descripcion: 'Envía una petición al administrador. Si la aprueba, ya no podrás solicitar servicios con esta cuenta.',
    aviso: 'No puedes tener solicitudes activas como contratante.',
    titulo: '¿Dejar de ser contratante?',
    texto: 'Cuéntanos por qué deseas dejar de ser contratante, un administrador revisará tu petición.',
    nombre: 'contratante',
  },
};

// Mismos límites que valida el back (RoleRemovalRequestDTO)
export const MIN_RAZON_ROL = 10;
export const MAX_RAZON_ROL = 500;

// Nombre legible de cada rol (perfil, edición y listado del admin)
export const NOMBRES_ROL = {
  CONTRATANTE: 'Contratante',
  TRABAJADOR: 'Trabajador',
  ADMIN: 'Administrador',
};