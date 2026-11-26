import { useState } from 'react';
import { useWorkerPhoto } from '../hooks/useWorkerPhoto';
import { getInitials } from '../requestForm';
import styles from './WorkerAvatar.module.css';

function WorkerAvatar({ worker, className = '' }) {
  const src = useWorkerPhoto(worker);
  const [failedSrc, setFailedSrc] = useState('');
  const initials = worker.initials || getInitials(worker.name);
  const showPhoto = Boolean(src) && failedSrc !== src;

  return (
    <span className={`${className} ${styles.frame}`} aria-hidden="true">
      {showPhoto ? (
        <img src={src} alt="" className={styles.photo} onError={() => setFailedSrc(src)} />
      ) : (
        initials
      )}
    </span>
  );
}

export default WorkerAvatar;