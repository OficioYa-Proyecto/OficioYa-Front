export const EMPTY_FORM = {
  description: '',
  photos: [],
  neighborhood: '',
  address: { roadType: '', main: '', cross: '', number: '' },
  exactAddress: '',
  date: '',
  time: '',
  workers: [],
};

const VIA_PATTERN = /^[0-9]{1,3}[A-Z]?$/;
const NUMBER_PATTERN = /^[0-9]{1,3}$/;

const pad = (value) => String(value).padStart(2, '0');
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function normalizeVia(value) {
  const clean = value.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return /^\d{0,3}[A-Z]?/.exec(clean)[0];
}

export function normalizeDigits(value) {
  return value.replace(/\D/g, '').slice(0, 3);
}

export function composeAddress({ roadType, main, cross, number }) {
  if (!roadType || !main || !cross || !number) {
    return '';
  }
  return `${roadType} ${main} # ${cross}-${number}`;
}

function validateAddress(address) {
  if (!address.roadType) {
    return 'Selecciona el tipo de vía.';
  }
  if (!VIA_PATTERN.test(address.main)) {
    return 'Escribe el número de la vía, por ejemplo 74 o 5A.';
  }
  if (!VIA_PATTERN.test(address.cross)) {
    return 'Escribe el número después del #, por ejemplo 39 o 39B.';
  }
  if (!NUMBER_PATTERN.test(address.number)) {
    return 'Escribe el último número, por ejemplo 25.';
  }
  return '';
}

function parseSchedule(date, time) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!d || !t) {
    return null;
  }
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hours, minutes] = [Number(t[1]), Number(t[2])];
  const result = new Date(year, month - 1, day, hours, minutes);
  const isReal =
    result.getFullYear() === year &&
    result.getMonth() === month - 1 &&
    result.getDate() === day &&
    result.getHours() === hours &&
    result.getMinutes() === minutes;
  return isReal ? result : null;
}

export function validateDetails(values, now = new Date()) {
  const errors = {};
  const address = { ...EMPTY_FORM.address, ...values.address };

  if (!values.description.trim()) {
    errors.description = 'Describe el servicio que necesitas.';
  }
  if (!values.neighborhood.trim()) {
    errors.neighborhood = 'Indica el barrio.';
  }

  const addressError = validateAddress(address);
  if (addressError) {
    errors.exactAddress = addressError;
  }

  if (!values.date) {
    errors.date = 'Selecciona la fecha del servicio.';
  } else if (!parseSchedule(values.date, '00:00')) {
    errors.date = 'La fecha no es válida.';
  } else if (values.date < todayISO(now)) {
    errors.date = 'La fecha no puede ser anterior a hoy.';
  }

  if (!values.time) {
    errors.time = 'Selecciona la hora del servicio.';
  } else if (!parseSchedule('2000-01-01', values.time)) {
    errors.time = 'La hora no es válida.';
  }

  if (!errors.date && !errors.time) {
    const when = parseSchedule(values.date, values.time);
    if (when <= now) {
      errors.time = 'La fecha y la hora deben ser posteriores al momento actual.';
    }
  }

  return errors;
}

export function deriveTitle(description, maxLength = 60) {
  const text = description.trim().replace(/\s+/g, ' ');
  const [firstSentence] = text.split(/[.!?]/);
  const base = firstSentence.trim() || text;
  if (base.length <= maxLength) {
    return capitalize(base);
  }
  const cut = base.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  const shortened = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${capitalize(shortened.trimEnd())}…`;
}

export function formatSchedule(date, time, { short = false } = {}) {
  const when = parseSchedule(date, time);
  if (!when) {
    return '';
  }
  const dayOptions = short
    ? { day: 'numeric', month: 'short' }
    : { weekday: 'long', day: 'numeric', month: 'long' };
  const day = capitalize(when.toLocaleDateString('es-CO', dayOptions));
  const hour = when.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${day} · ${hour}`;
}

export function getInitials(name) {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}