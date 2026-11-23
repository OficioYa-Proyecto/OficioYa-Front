import { useState } from 'react';
import { DETAILS_FORM_ID, ROAD_TYPES } from '../config';
import {
  EMPTY_FORM,
  composeAddress,
  normalizeDigits,
  normalizeVia,
  todayISO,
  validateDetails,
} from '../requestForm';
import { CalendarIcon, ClockIcon, MapPinIcon } from './icons';
import PhotoPicker from './PhotoPicker';
import styles from './RequestDetailsStep.module.css';

const NEIGHBORHOODS = [
  'Laureles',
  'El Poblado',
  'Envigado',
  'Sabaneta',
  'Bello',
  'Itagüí',
  'Robledo',
  'Belén',
  'Manrique',
  'Aranjuez',
];

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
        {...fieldProps('field-exactAddress', error, { required: true, hint: true })}
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
        placeholder="74"
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
        placeholder="39"
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
        placeholder="25"
        aria-label="Último número de la dirección"
        aria-invalid={invalid}
        value={address.number}
        onChange={(event) => update({ number: normalizeDigits(event.target.value) })}
      />
    </div>
  );
}

function RequestDetailsStep({ values, onChange, onSubmit }) {
  const [submitted, setSubmitted] = useState(false);
  const errors = validateDetails(values);
  const visible = submitted ? errors : {};

  const bind = (name) => ({
    value: values[name],
    onChange: (event) => onChange({ [name]: event.target.value }),
  });

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

  return (
    <form id={DETAILS_FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.layout}>
        <div className={styles.column}>
          <Field
            id="field-description"
            label="¿Qué necesitas resolver?"
            required
            error={visible.description}
          >
            <textarea
              rows={4}
              placeholder="Ej: Necesito reparar una fuga debajo del lavaplatos."
              {...fieldProps('field-description', visible.description, { required: true })}
              {...bind('description')}
            />
          </Field>

          <PhotoPicker photos={values.photos} onChange={(photos) => onChange({ photos })} />
        </div>

        <div className={styles.column}>
          <Field
            id="field-neighborhood"
            label="Barrio"
            required
            error={visible.neighborhood}
            icon={<MapPinIcon size={18} />}
          >
            <select
              {...fieldProps('field-neighborhood', visible.neighborhood, { required: true })}
              {...bind('neighborhood')}
            >
              <option value="">Selecciona</option>
              {NEIGHBORHOODS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="field-exactAddress"
            label="Dirección exacta"
            required
            hint="Ejemplo: Carrera 74 # 39-25"
            error={visible.exactAddress}
          >
            <AddressFields values={values} onChange={onChange} error={visible.exactAddress} />
          </Field>

          <div className={`${styles.row} ${styles.rowEven}`}>
            <Field
              id="field-date"
              label="Fecha"
              required
              error={visible.date}
              icon={<CalendarIcon size={18} />}
            >
              <input
                type="date"
                min={todayISO()}
                {...fieldProps('field-date', visible.date, { required: true })}
                {...bind('date')}
              />
            </Field>
            <Field
              id="field-time"
              label="Hora"
              required
              error={visible.time}
              icon={<ClockIcon size={18} />}
            >
              <input
                type="time"
                {...fieldProps('field-time', visible.time, { required: true })}
                {...bind('time')}
              />
            </Field>
          </div>
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