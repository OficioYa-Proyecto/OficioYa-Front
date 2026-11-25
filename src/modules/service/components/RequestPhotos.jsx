import { useEffect, useRef, useState } from 'react';
import { getImagesByRoot } from '../../core/lib/imageService';
import styles from './RequestPhotos.module.css';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

function imageSrc(image) {
  const url = image?.url || '';
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
}

// Fotos adjuntas a la solicitud (tipo REQUEST, rootId de la solicitud).
// Abajo del estado se ven hasta tres miniaturas; al abrir una se puede recorrer el carrusel.
export default function RequestPhotos({ requestId, rootId }) {
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);

  useEffect(() => {
    const id = rootId || requestId;
    if (!id) return undefined;
    let alive = true;
    getImagesByRoot(id, { tipo: 'REQUEST' })
      .then((list) => {
        if (!alive) return;
        const usable = (Array.isArray(list) ? list : []).filter((item) => imageSrc(item));
        setPhotos(usable);
      })
      .catch(() => {
        if (alive) setPhotos([]);
      });
    return () => {
      alive = false;
    };
  }, [requestId, rootId]);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [open]);

  if (photos.length === 0) return null;

  const move = (delta) => setIndex((current) => (current + delta + photos.length) % photos.length);
  const current = photos[index];

  return (
    <div className={styles.wrap}>
      <div className={styles.thumbs}>
        {photos.slice(0, 3).map((photo, position) => (
          <button
            key={photo.id || position}
            type="button"
            className={styles.thumb}
            onClick={() => {
              setIndex(position);
              setOpen(true);
            }}
            aria-label={`Ver foto ${position + 1} de ${photos.length}`}
          >
            <img src={imageSrc(photo)} alt={photo.nombre || `Foto ${position + 1} del servicio`} loading="lazy" />
          </button>
        ))}
        {photos.length > 3 && <span className={styles.more}>+{photos.length - 3}</span>}
      </div>

      {open && (
        <dialog
          ref={dialog}
          className={styles.viewer}
          aria-label="Fotos del servicio"
          onClose={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') move(1);
            if (event.key === 'ArrowLeft') move(-1);
          }}
        >
          <div className={styles.viewerHead}>
            <strong>Fotos del servicio</strong>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </div>
          <div className={styles.stage}>
            {photos.length > 1 && (
              <button type="button" className={styles.nav} onClick={() => move(-1)} aria-label="Foto anterior">
                ‹
              </button>
            )}
            <img src={imageSrc(current)} alt={current.nombre || `Foto ${index + 1} del servicio`} />
            {photos.length > 1 && (
              <button type="button" className={styles.nav} onClick={() => move(1)} aria-label="Foto siguiente">
                ›
              </button>
            )}
          </div>
          <div className={styles.viewerFoot}>
            <span>{index + 1} de {photos.length}</span>
            {photos.length > 1 && (
              <div className={styles.dots}>
                {photos.map((photo, position) => (
                  <button
                    key={photo.id || position}
                    type="button"
                    className={`${styles.dot} ${position === index ? styles.active : ''}`}
                    onClick={() => setIndex(position)}
                    aria-label={`Ir a la foto ${position + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
