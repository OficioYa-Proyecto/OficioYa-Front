import { ADDRESS_NOTE_MAX, TIME_SLOTS } from './config';

export const EMPTY_FORM = {
  tradeId: '',
  trade: '',
  description: '',
  photos: [],
  localityId: '',
  locality: '',
  neighborhood: '',
  zoneIds: [],
  address: { roadType: '', main: '', cross: '', number: '' },
  exactAddress: '',
  addressNote: '',
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

export function normalizeNote(value) {
  return value.replace(/\s+/g, ' ').slice(0, ADDRESS_NOTE_MAX);
}

export function cleanNote(value) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function composeAddress({ roadType, main, cross, number }) {
  if (!roadType || !main || !cross || !number) {
    return '';
  }
  return `${roadType} ${main} # ${cross}-${number}`;
}

export function composeFullAddress(exactAddress, addressNote) {
  const base = (exactAddress ?? '').trim();
  const note = cleanNote(addressNote);
  return note ? `${base}, ${note}` : base;
}

function validateAddress(address) {
  if (!address.roadType) {
    return 'Selecciona el tipo de vía.';
  }
  if (!VIA_PATTERN.test(address.main)) {
    return 'Escribe el número de la vía.';
  }
  if (!VIA_PATTERN.test(address.cross)) {
    return 'Escribe el número después del #.';
  }
  if (!NUMBER_PATTERN.test(address.number)) {
    return 'Escribe el último número de la dirección.';
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

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WEEKDAY_NAMES = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miércoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sábado',
  SUNDAY: 'domingo',
};

/** Franjas del trabajador (desde el botón Contratar) que aplican a esa fecha. */
function scheduleFor(date, schedule) {
  const when = parseSchedule(date, '00:00');
  if (!when) {
    return [];
  }
  const weekday = WEEKDAYS[when.getDay()];
  return schedule.filter((slot) => {
    if (slot.tipo === 'FIXED') {
      return slot.desde === date;
    }
    return slot.dia === weekday && (!slot.desde || slot.desde <= date) && (!slot.hasta || date <= slot.hasta);
  });
}

/** Hay horario del trabajador que respetar (solo desde Contratar, y si el trabajador publicó franjas). */
export function hasSchedule(schedule) {
  return Array.isArray(schedule) && schedule.length > 0;
}

/** El trabajador trabaja ese día según sus franjas. */
export function worksOn(date, schedule) {
  return !hasSchedule(schedule) || scheduleFor(date, schedule).length > 0;
}

export function timeSlots(date, now = new Date(), schedule = null) {
  const slots = [];
  for (let hour = TIME_SLOTS.startHour; hour <= TIME_SLOTS.endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += TIME_SLOTS.stepMinutes) {
      slots.push(`${pad(hour)}:${pad(minute)}`);
    }
  }
  // Desde Contratar solo se ofrecen las horas dentro de las franjas del trabajador ese día.
  const ranges = hasSchedule(schedule) ? scheduleFor(date, schedule) : null;
  const inSchedule = ranges
    ? slots.filter((slot) => ranges.some((range) => range.inicio <= slot && slot < range.fin))
    : slots;
  if (date !== todayISO(now)) {
    return inSchedule;
  }
  return inSchedule.filter((slot) => parseSchedule(date, slot) > now);
}

const SCHEDULE_DAYS_AHEAD = 60;

/** Días (ISO) en los que el trabajador tiene franjas con horas todavía disponibles. */
export function availableDates(schedule, now = new Date(), daysAhead = SCHEDULE_DAYS_AHEAD) {
  if (!hasSchedule(schedule)) {
    return [];
  }
  const dates = new Set();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let offset = 0; offset < daysAhead; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const iso = todayISO(day);
    if (worksOn(iso, schedule) && timeSlots(iso, now, schedule).length > 0) {
      dates.add(iso);
    }
  }
  // Una franja fija puede estar más allá del horizonte de los días repetitivos.
  for (const slot of schedule) {
    if (slot.tipo === 'FIXED' && slot.desde && slot.desde >= todayISO(now)) {
      dates.add(slot.desde);
    }
  }
  return [...dates].sort();
}

/** Etiqueta legible para un día disponible, por ejemplo: "Lunes 24 nov". */
export function formatAvailableDate(date) {
  const when = parseSchedule(date, '00:00');
  if (!when) {
    return date;
  }
  return capitalize(
    when.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' }),
  );
}

/** Texto con el horario del trabajador, por ejemplo: "lunes de 8:00 a. m. a 12:00 p. m. (hasta 5 de dic.)". */
export function describeSchedule(schedule) {
  if (!hasSchedule(schedule)) {
    return '';
  }
  return schedule
    .map((slot) => {
      const hours = `de ${formatSlot(slot.inicio)} a ${formatSlot(slot.fin)}`;
      if (slot.tipo === 'FIXED') {
        const day = parseSchedule(slot.desde, '00:00');
        const label = day ? day.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : slot.desde;
        return `${label} ${hours}`;
      }
      const until = slot.hasta ? parseSchedule(slot.hasta, '00:00') : null;
      const untilText = until ? ` (hasta ${until.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })})` : '';
      return `${WEEKDAY_NAMES[slot.dia] ?? slot.dia} ${hours}${untilText}`;
    })
    .join(' · ');
}

export function formatSlot(slot) {
  const when = parseSchedule('2000-01-01', slot);
  if (!when) {
    return slot;
  }
  return when.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function validateDetails(values, now = new Date(), schedule = null) {
  const errors = {};
  const address = { ...EMPTY_FORM.address, ...values.address };

  if (!values.tradeId) {
    errors.tradeId = 'Selecciona el trabajo u oficio que necesitas.';
  }
  if (!values.description.trim()) {
    errors.description = 'Describe el problema.';
  }
  if (!values.localityId || !String(values.locality ?? '').trim()) {
    errors.localityId = 'Selecciona la localidad.';
  }
  if (!String(values.neighborhood ?? '').trim()) {
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
  } else if (!worksOn(values.date, schedule)) {
    errors.date = 'El trabajador no trabaja ese día. Elige un día de su horario.';
  }

  if (!values.time) {
    errors.time = 'Selecciona la hora del servicio.';
  } else if (!timeSlots('', now).includes(values.time)) {
    errors.time = 'Selecciona una hora de la lista.';
  } else if (hasSchedule(schedule) && values.date && !timeSlots(values.date, now, schedule).includes(values.time)) {
    errors.time = 'Esa hora está fuera del horario del trabajador.';
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