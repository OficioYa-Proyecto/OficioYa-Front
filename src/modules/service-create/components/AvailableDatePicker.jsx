import { useState } from 'react';
import { formatAvailableDate } from '../requestForm';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import styles from './AvailableDatePicker.module.css';

const WEEKDAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const pad = (value) => String(value).padStart(2, '0');
const monthKey = (year, month) => `${year}-${pad(month + 1)}`;

/** Calendario que solo permite elegir días con franja publicada por el trabajador. */
export default function AvailableDatePicker({ dates = [], value, onChange, ...field }) {
  const sortedDates = [...new Set(dates)].sort();
  const availableSet = new Set(sortedDates);
  const anchor = value && availableSet.has(value) ? value : sortedDates[0];
  const initialMonth = anchor
    ? new Date(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1, 1)
    : new Date();
  const [cursor, setCursor] = useState(() => ({
    year: initialMonth.getFullYear(),
    month: initialMonth.getMonth(),
  }));
  const [open, setOpen] = useState(false);

  const firstKey = sortedDates[0]?.slice(0, 7);
  const lastKey = sortedDates[sortedDates.length - 1]?.slice(0, 7);
  const currentKey = monthKey(cursor.year, cursor.month);
  const monthLabel = formatMonth(cursor);
  const firstWeekday = (new Date(cursor.year, cursor.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells = [];
  for (let offset = 0; offset < firstWeekday; offset += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
    cells.push({ iso, day, available: availableSet.has(iso) });
  }

  const shiftMonth = (delta) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selectDate = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  const focusIso = value && availableSet.has(value) ? value : sortedDates[0];
  const triggerLabel = value
    ? formatAvailableDate(value)
    : sortedDates.length
      ? 'Selecciona un día disponible'
      : 'Sin días disponibles';

  return (
    <div
      className={styles.picker}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        {...field}
      >
        <span>{triggerLabel}</span>
        <ChevronRightIcon size={16} className={styles.chevron} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Días disponibles">
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Mes anterior"
              disabled={!firstKey || currentKey <= firstKey}
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeftIcon size={18} />
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className={styles.navButton}
              aria-label="Mes siguiente"
              disabled={!lastKey || currentKey >= lastKey}
              onClick={() => shiftMonth(1)}
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className={styles.grid}>
            {cells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} className={styles.empty} aria-hidden="true" />;
              }
              if (!cell.available) {
                return (
                  <span key={cell.iso} className={styles.unavailable} aria-hidden="true">
                    {cell.day}
                  </span>
                );
              }
              return (
                <button
                  key={cell.iso}
                  type="button"
                  className={`${styles.day} ${cell.iso === value ? styles.selected : ''}`}
                  aria-label={formatAvailableDate(cell.iso)}
                  aria-pressed={cell.iso === value}
                  autoFocus={cell.iso === focusIso}
                  onClick={() => selectDate(cell.iso)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <p className={styles.legend}>
            {sortedDates.length
              ? 'Solo los días marcados tienen horario disponible.'
              : 'Este trabajador no tiene días disponibles en este momento.'}
          </p>
        </div>
      )}
    </div>
  );
}

function formatMonth(cursor) {
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
