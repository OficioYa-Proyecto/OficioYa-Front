export const UNITS = [
  { value: 'PER_HOUR', label: 'por hora' },
  { value: 'PER_JOB', label: 'por trabajo' },
  { value: 'PER_DAY', label: 'por día' },
];

export const DAYS = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

export function unitName(input) {
  return UNITS.find((unidad) => unidad.value === input)?.label ?? '';
}

export function dayName(input) {
  return DAYS.find((dia) => dia.value === input)?.label ?? '';
}

// Mismo criterio que el back: sin tildes, mayúsculas ni espacios de más
export function normalizeName(text) {
  return (text ?? '').trim().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').toLowerCase();
}

// Agrupa los barrios por localidad emparejando por nombre.
// Devuelve [{ id, name, zones }] ordenado; los barrios sin localidad van al final como { id: null, name: 'Otras' }.
export function groupCoverage(zones, localities) {
  const byName = new Map(localities.map((locality) => [normalizeName(locality.name), locality]));
  const groups = new Map();
  const others = [];
  zones.forEach((zone) => {
    const locality = byName.get(normalizeName(zone.locality));
    if (!locality) {
      others.push(zone);
      return;
    }
    if (!groups.has(locality.id)) groups.set(locality.id, { id: locality.id, name: locality.name, zones: [] });
    groups.get(locality.id).zones.push(zone);
  });
  const byZoneName = (a, b) => a.name.localeCompare(b.name, 'es');
  const list = [...groups.values()].sort(byZoneName);
  list.forEach((group) => group.zones.sort(byZoneName));
  if (others.length) list.push({ id: null, name: 'Otras', zones: others.sort(byZoneName) });
  return list;
}

// Valor inicial del selector a partir de lo guardado. Quien tenía todos los barrios de una localidad
// sueltos la ve marcada como localidad (al guardar se le registra y se borran los barrios sueltos).
export function initialCoverage(saved, groups) {
  const localityIds = new Set(saved.localityIds);
  const zoneIds = new Set(saved.zoneIds);
  groups.forEach((group) => {
    if (group.id !== null && group.zones.every((zone) => zoneIds.has(zone.id))) {
      localityIds.add(group.id);
      group.zones.forEach((zone) => zoneIds.delete(zone.id));
    }
  });
  return { localityIds: [...localityIds], zoneIds: [...zoneIds] };
}

// Nombres de las localidades que cubre el trabajador: las guardadas (localityIds) y las de sus barrios (zoneIds).
// Un barrio sin localidad conocida cuenta como "Otras". Devuelve null mientras cargan los catálogos.
export function coveredLocalities(profile, zones, localities) {
  if (!zones || !localities) return null;
  const canonical = new Map(localities.map((locality) => [normalizeName(locality.name), locality.name]));
  const names = new Set();
  (profile.localityIds ?? []).forEach((id) => {
    const locality = localities.find((item) => item.id === id);
    if (locality) names.add(locality.name);
  });
  profile.zoneIds.forEach((id) => {
    const zone = zones.find((item) => item.id === id);
    if (zone) names.add(canonical.get(normalizeName(zone.locality)) ?? 'Otras');
  });
  return [...names].sort((a, b) => a.localeCompare(b, 'es'));
}

export function formatMoney(input) {
  return `$${new Intl.NumberFormat('es-CO').format(input)}`;
}

// Fecha ISO (AAAA-MM-DD, con o sin hora) a DD/MM/AAAA
export function formatDate(input) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input ?? ''));
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

// Misma regla que WorkerTradeRequest en el back: @Positive y @Digits(integer = 8, fraction = 2).
const VALID_RATE = /^\d{1,8}(\.\d{1,2})?$/;

export function validateRate(input) {
  const rawText = String(input ?? '').trim();
  if (!rawText) return 'Ingresa la tarifa';
  if (!VALID_RATE.test(rawText)) return 'Usa solo números (máximo 8 cifras y 2 decimales)';
  if (!(Number(rawText) > 0)) return 'La tarifa debe ser mayor que 0';
  return '';
}

// "andrea.salazar@gmail.com" -> "an•••••••••••@gmail.com"
export function maskEmail(correo) {
  if (!correo) return '';
  const [usuario, dominio] = correo.split('@');
  if (!dominio) return '•••';
  const visible = usuario.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(usuario.length - visible.length, 3))}@${dominio}`;
}

// "3001234567" -> "••• ••• 4567"
export function maskPhone(telefono) {
  if (!telefono) return '';
  const digits = String(telefono).replace(/\D/g, '');
  return `••• ••• ${digits.slice(-4)}`;
}

export function getInitials(name) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'T';
  const text = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return text.toUpperCase();
}
