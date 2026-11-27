export function decimal(valor) {
  if (valor == null || Number.isNaN(Number(valor))) {
    return '—';
  }
  return Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fecha(valor) {
  return new Date(valor).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

const UNIDADES = { PER_HOUR: 'por hora', PER_DAY: 'por día', PER_JOB: 'por trabajo' };

/** Pesos colombianos sin decimales: $15.000. */
export function dinero(valor) {
  return `$${Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

/** Unidad de la tarifa de Worker en palabras. */
export function unidad(valor) {
  return UNIDADES[valor] ?? '';
}
