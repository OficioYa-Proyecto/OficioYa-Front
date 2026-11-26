// Acciones disponibles según rol y estado de la solicitud.
export function actionsFor(role, state) {
  const actions = [];
  if (role === 'TRABAJADOR') {
    if (state === 'PENDING') {
      actions.push({ key: 'accept', label: 'Aceptar' });
      actions.push({ key: 'reject', label: 'Rechazar', variant: 'secondary' });
    }
    if (state === 'ACCEPTED') {
      actions.push({ key: 'complete', label: 'Marcar cumplida' });
      actions.push({ key: 'cancel', label: 'Cancelar', variant: 'secondary' });
    }
    if (state === 'CONFLICT') {
      actions.push({ key: 'cancel', label: 'Cancelar', variant: 'secondary' });
    }
  }
  if (role === 'CONTRATANTE') {
    if (state === 'CONFLICT') {
      actions.push({ key: 'acceptConflict', label: 'Elegir esta' });
      actions.push({ key: 'cancel', label: 'Cancelar', variant: 'secondary' });
    }
    if (['PENDING', 'ACCEPTED'].includes(state)) {
      actions.push({ key: 'cancel', label: 'Cancelar', variant: 'secondary' });
    }
  }
  return actions;
}
