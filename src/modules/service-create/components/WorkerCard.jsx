import { StarIcon } from './icons';
import WorkerAvatar from './WorkerAvatar';
import styles from './WorkerCard.module.css';

function WorkerCard({ worker, selected, onToggle }) {
  const rating = typeof worker.rating === 'string' ? worker.rating : worker.rating?.toFixed?.(1) ?? worker.rating;
  const jobs = worker.jobs || (worker.services ? `${worker.services} servicios` : '');
  const distance = worker.distance || (worker.distanceKm != null ? `${worker.distanceKm.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` : '');
  const available = worker.available || worker.availability || '';

  return (
    <label className={selected ? `${styles.card} ${styles.selected}` : styles.card}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={selected}
        onChange={() => onToggle(worker)}
      />
      <WorkerAvatar worker={worker} className={styles.avatar} />
      <span className={styles.info}>
        <strong className={styles.name}>{worker.name}</strong>
        <span className={styles.trade}>{worker.trade}</span>
        {worker.zone && <span className={styles.rating}>{worker.zone}</span>}
        {rating != null ? (
          <span className={styles.rating}>
            <StarIcon size={14} />
            {rating}
            {jobs ? ` \u00b7 ${jobs}` : ''}
          </span>
        ) : (
          jobs && <span className={styles.rating}>{jobs}</span>
        )}
        {worker.rate && <span className={styles.rating}>{worker.rate}</span>}
      </span>
      <span className={styles.side}>
        {distance && <span className={styles.distance}>{distance}</span>}
        {available && <span className={styles.availability}>{available}</span>}
      </span>
    </label>
  );
}

export default WorkerCard;