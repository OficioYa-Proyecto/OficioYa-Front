import { useState } from 'react';
import Button from '../../core/design-system/Button';
import { ADDRESS_NOTE_MAX, DETAILS_FORM_ID, ROAD_TYPES } from '../config';
import { useLocalities } from '../hooks/useLocalities';
import { useTrades } from '../hooks/useTrades';
import { useZones } from '../hooks/useZones';
import {
  EMPTY_FORM,
  availableDates,
  composeAddress,
  describeSchedule,
  formatAvailableDate,
  formatSlot,
  normalizeDigits,
  normalizeNote,
  normalizeVia,
  timeSlots,
  todayISO,
  validateDetails,
} from '../requestForm';
import { CalendarIcon, ClockIcon, MapPinIcon } from './icons';
import PhotoPicker from './PhotoPicker';
import styles from './RequestDetailsStep.module.css';

/** Oficios agrupados por categoría, en orden alfabético; "Otros oficios" al final. */
function groupByCategory(trades) {
  const groups = new Map();
  for (const trade of trades) {
    if (!groups.has(trade.category)) {
      groups.set(trade.category, []);
    }
    groups.get(trade.category).push(trade);
  }
  return Array.from(groups, ([category, items]) => ({
    category,
    items: [...items].sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })).sort((a, b) => {
    if (a.category === 'Otros oficios' || b.category === 'Otros oficios') {
      return a.category === 'Otros oficios' ? 1 : -1;
    }
    return a.category.localeCompare(b.category, 'es');
  });
}

function fieldProps(id, error, { required = false, hint = false } = {}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  return {
    id,
    'aria-required': required || undefined,
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy || undefined,
  };
}

function Field({ id, label, required, hint, error, icon, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className={icon ? styles.withIcon : undefined}>
        {icon}
        {children}
      </div>
      {hint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function normalizeBarrio(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function barrioSuggestions(zones, query, limit = 6) {
  const text = normalizeBarrio(query);
  if (!text) return [];
  return zones
    .filter((zone) => normalizeBarrio(zone.name).includes(text))
    .sort((a, b) => {
      const startsA = normalizeBarrio(a.name).startsWith(text) ? 0 : 1;
      const startsB = normalizeBarrio(b.name).startsWith(text) ? 0 : 1;
      return startsA - startsB || a.name.localeCompare(b.name, 'es');
    })
    .slice(0, limit);
}

function AddressFields({ values, onChange, error }) {
  const address = { ...EMPTY_FORM.address, ...values.address };
  const invalid = Boolean(error);

  const update = (patch) => {
    const next = { ...address, ...patch };
    onChange({ address: next, exactAddress: composeAddress(next) });
  };

  return (
    <div className={styles.address}>
      <select
        className={styles.addressSelect}
        {...fieldProps('field-exactAddress', error, { required: true })}
        value={address.roadType}
        onChange={(event) => update({ roadType: event.target.value })}
      >
        <option value="">Tipo de vía</option>
        {ROAD_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        className={styles.addressInput}
        type="text"
        autoComplete="off"
        maxLength={4}
        aria-label="Número o letra de la vía"
        aria-invalid={invalid}
        value={address.main}
        onChange={(event) => update({ main: normalizeVia(event.target.value) })}
      />
      <span className={styles.separator} aria-hidden="true">
        #
      </span>
      <input
        className={styles.addressInput}
        type="text"
        autoComplete="off"
        maxLength={4}
        aria-label="Número después del numeral"
        aria-invalid={invalid}
        value={address.cross}
        onChange={(event) => update({ cross: normalizeVia(event.target.value) })}
      />
      <span className={styles.separator} aria-hidden="true">
        -
      </span>
      <input
        className={styles.addressInput}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={3}
        aria-label="Último número de la dirección"
        aria-invalid={invalid}
        value={address.number}
        onChange={(event) => update({ number: normalizeDigits(event.target.value) })}
      />
    </div>
  );
}

function RequestDetailsStep({ values, onChange, onSubmit, locked = {} }) {
  const [submitted, setSubmitted] = useState(false);
  const [showBarrios, setShowBarrios] = useState(false);
  const [activeBarrio, setActiveBarrio] = useState(-1);
  const errors = validateDetails(values, new Date(), locked.schedule);
  const visible = submitted ? errors : {};
  const zones = useZones();
  const localities = useLocalities();
  // Desde Contratar solo se pueden elegir localidades donde trabaja el trabajador elegido.
  const allowedZones = locked.zoneIds
    ? zones.items.filter((zone) => locked.zoneIds.includes(zone.id))
    : zones.items;
  const allowedLocalities = locked.zoneIds
    ? localities.items.filter((locality) =>
      allowedZones.some((zone) => zone.locality === locality.name))
    : localities.items;
  const barrioCandidates = allowedZones.filter(
    (zone) => !values.localityId || zone.locality === values.locality,
  );
  const barrios = showBarrios ? barrioSuggestions(barrioCandidates, values.neighborhood) : [];
  const trades = useTrades();
  const tradeGroups = groupByCategory(trades.items);
  // Desde Contratar solo se pueden elegir días en los que el trabajador tiene franjas disponibles.
  const scheduledDates = locked.schedule ? availableDates(locked.schedule) : [];

  const bind = (name) => ({
    value: values[name],
    onChange: (event) => onChange({ [name]: event.target.value }),
  });

  const changeLocality = (localityId) => {
    const locality = localities.items.find((item) => String(item.id) === String(localityId));
    const localityName = locality?.name ?? '';
    const zoneIds = allowedZones
      .filter((zone) => zone.locality === localityName)
      .map((zone) => zone.id);
    const exact = allowedZones.find(
      (zone) => zone.locality === localityName
        && normalizeBarrio(zone.name) === normalizeBarrio(values.neighborhood),
    );
    onChange({ localityId, locality: localityName, zoneIds: exact ? [exact.id] : zoneIds });
  };

  const changeNeighborhood = (text) => {
    const exact = barrioCandidates.find(
      (zone) => normalizeBarrio(zone.name) === normalizeBarrio(text),
    );
    const fallback = values.localityId ? barrioCandidates.map((zone) => zone.id) : [];
    onChange({ neighborhood: text, zoneIds: exact ? [exact.id] : fallback });
    setShowBarrios(true);
    setActiveBarrio(-1);
  };

  const selectBarrio = (zone) => {
    const locality = localities.items.find((item) => item.name === zone.locality);
    onChange({
      neighborhood: zone.name,
      zoneIds: [zone.id],
      ...(values.locality
        ? {}
        : { localityId: locality ? String(locality.id) : '', locality: zone.locality || '' }),
    });
    setShowBarrios(false);
    setActiveBarrio(-1);
  };

  const handleBarrioKeyDown = (event) => {
    if (barrios.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveBarrio((index) => Math.min(index + 1, barrios.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveBarrio((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeBarrio >= 0) {
      event.preventDefault();
      selectBarrio(barrios[activeBarrio]);
    } else if (event.key === 'Escape') {
      setShowBarrios(false);
      setActiveBarrio(-1);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    const [firstInvalid] = Object.keys(errors);
    if (firstInvalid) {
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
    onSubmit();
  };

  const changeDate = (date) => {
    onChange(
      timeSlots(date, new Date(), locked.schedule).includes(values.time) ? { date } : { date, time: '' },
    );
  };

  return (
    <form id={DETAILS_FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.layout}>
        <div className={styles.column}>
          <Field
            id="field-tradeId"
            label="Trabajo u oficio"
            required
            error={visible.tradeId}
            hint={locked.trade ? 'Es el oficio del trabajador que elegiste.' : undefined}
          >
            <select
              {...fieldProps('field-tradeId', visible.tradeId, { required: true, hint: locked.trade })}
              disabled={locked.trade}
              value={values.tradeId}
              onChange={(event) => {
                const trade = trades.items.find((item) => item.id === event.target.value);
                onChange({ tradeId: trade ? trade.id : '', trade: trade ? trade.name : '' });
              }}
            >
              <option value="">{trades.status === 'loading' ? 'Cargando oficios' : 'Selecciona'}</option>
              {tradeGroups.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.items.map((trade) => (
                    <option key={trade.id} value={trade.id}>
                      {trade.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          {trades.status === 'error' && (
            <div className={styles.hint} role="alert">
              <p>No pudimos cargar los oficios.</p>
              <Button type="button" variant="secondary" onClick={trades.retry}>
                Reintentar
              </Button>
            </div>
          )}

          <Field
            id="field-description"
            label="Describe el problema"
            required
            error={visible.description}
          >
            <textarea
              rows={4}
              placeholder="Ej.: El lavamanos del baño tiene una fuga debajo del sifón."
              {...fieldProps('field-description', visible.description, { required: true })}
              {...bind('description')}
            />
          </Field>

          <PhotoPicker photos={values.photos} onChange={(photos) => onChange({ photos })} />
        </div>

        <div className={styles.column}>
          <div className={styles.row}>
            <Field
              id="field-localityId"
              label="Localidad"
              required
              error={visible.localityId}
              icon={<MapPinIcon size={18} />}
              hint={locked.zoneIds ? 'Solo aparecen las localidades donde trabaja el trabajador que elegiste.' : undefined}
            >
              <select
                {...fieldProps('field-localityId', visible.localityId, { required: true, hint: Boolean(locked.zoneIds) })}
                value={values.localityId}
                onChange={(event) => changeLocality(event.target.value)}
              >
                <option value="">{localities.status === 'loading' ? 'Cargando localidades' : 'Selecciona'}</option>
                {allowedLocalities.map((locality) => (
                  <option key={locality.id} value={locality.id}>
                    {locality.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="field-neighborhood"
              label="Barrio"
              required
              error={visible.neighborhood}
              hint="Escribe el barrio y selecciona una sugerencia para afinar la búsqueda."
            >
              <div className={styles.autocomplete}>
                <input
                  type="text"
                  autoComplete="off"
                  maxLength={120}
                  placeholder="Ej.: Chapinero"
                  role="combobox"
                  aria-expanded={barrios.length > 0}
                  aria-controls="field-neighborhood-suggestions"
                  aria-autocomplete="list"
                  aria-activedescendant={activeBarrio >= 0 ? `barrio-suggestion-${activeBarrio}` : undefined}
                  {...fieldProps('field-neighborhood', visible.neighborhood, { required: true, hint: true })}
                  value={values.neighborhood}
                  onChange={(event) => changeNeighborhood(event.target.value)}
                  onFocus={() => setShowBarrios(true)}
                  onBlur={() => setShowBarrios(false)}
                  onKeyDown={handleBarrioKeyDown}
                />
                {barrios.length > 0 && (
                  <ul id="field-neighborhood-suggestions" role="listbox" className={styles.suggestions}>
                    {barrios.map((zone, index) => (
                      <li
                        key={zone.id}
                        id={`barrio-suggestion-${index}`}
                        role="option"
                        aria-selected={index === activeBarrio}
                        className={styles.suggestion}
                      >
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectBarrio(zone)}
                        >
                          <span>{zone.name}</span>
                          {zone.locality && <small>{zone.locality}</small>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
          </div>
          {localities.status === 'error' && (
            <div className={styles.hint} role="alert">
              <p>No pudimos cargar las localidades.</p>
              <Button type="button" variant="secondary" onClick={localities.retry}>
                Reintentar
              </Button>
            </div>
          )}
          {zones.status === 'error' && (
            <p className={styles.hint}>
              No pudimos cargar las zonas para afinar la búsqueda; puedes continuar con el barrio escrito.
            </p>
          )}

          <Field
            id="field-exactAddress"
            label="Dirección exacta"
            required
            error={visible.exactAddress}
          >
            <AddressFields values={values} onChange={onChange} error={visible.exactAddress} />
          </Field>

          <Field id="field-addressNote" label="Información adicional">
            <input
              type="text"
              autoComplete="off"
              maxLength={ADDRESS_NOTE_MAX}
              {...fieldProps('field-addressNote', '')}
              value={values.addressNote ?? ''}
              onChange={(event) => onChange({ addressNote: normalizeNote(event.target.value) })}
            />
          </Field>

          <div className={`${styles.row} ${styles.rowEven}`}>
            <Field
              id="field-date"
              label="Fecha"
              required
              error={visible.date}
              icon={<CalendarIcon size={18} />}
            >
              {locked.schedule ? (
                <select
                  {...fieldProps('field-date', visible.date, { required: true })}
                  value={values.date}
                  onChange={(event) => changeDate(event.target.value)}
                >
                  <option value="">Selecciona un día disponible</option>
                  {scheduledDates.map((date) => (
                    <option key={date} value={date}>
                      {formatAvailableDate(date)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="date"
                  min={todayISO()}
                  {...fieldProps('field-date', visible.date, { required: true })}
                  value={values.date}
                  onChange={(event) => changeDate(event.target.value)}
                />
              )}
            </Field>
            <Field
              id="field-time"
              label="Hora"
              required
              error={visible.time}
              icon={<ClockIcon size={18} />}
            >
              <select
                {...fieldProps('field-time', visible.time, { required: true })}
                {...bind('time')}
              >
                <option value="">Selecciona</option>
                {timeSlots(values.date, new Date(), locked.schedule).map((slot) => (
                  <option key={slot} value={slot}>
                    {formatSlot(slot)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {locked.schedule && (
            <p className={styles.hint}>
              Horario del trabajador: {describeSchedule(locked.schedule)}. Solo puedes elegir días y horas dentro de
              ese horario.
            </p>
          )}
        </div>
      </div>

      <p className={styles.legend}>
        <span className={styles.required} aria-hidden="true">
          *
        </span>{' '}
        Campo obligatorio
      </p>
    </form>
  );
}

export default RequestDetailsStep;