import { useState } from 'react';
import Button from '../../core/design-system/Button';
import StatusMessage from './ui/StatusMessage';
import ui from './ui/ui.module.css';
import { useLocalities, useZones } from '../hooks/useCatalogs';
import { useMyWorker } from '../hooks/useMyWorker';
import { useSavedCoverage } from '../hooks/useSavedCoverage';
import { addLocality, addZone, removeLocality, removeZone } from '../services/workersService';
import { groupCoverage, initialCoverage } from './formats';
import LocalityPicker from './LocalityPicker';
import ProfileStatus from './ProfileStatus';
import PageHeading from './PageHeading';
import styles from './worker.module.css';

function CoveragePage() {
  const { data: profile, loading, error, refresh } = useMyWorker();
  const { data: zones, error: zonesError } = useZones();
  const { data: localities, error: localitiesError } = useLocalities();
  const { data: saved, error: savedError, reload } = useSavedCoverage(profile?.id);
  // Selección en edición; null = todavía sin cambios (se muestra la guardada).
  const [selection, setSelection] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  if (!profile) return <ProfileStatus error={error} loading={loading} />;

  const locked = profile.status === 'PAUSED';
  const ready = Boolean(zones && localities && saved);
  const groups = ready ? groupCoverage(zones, localities) : [];
  const value = selection ?? (ready ? initialCoverage(saved, groups) : { localityIds: [], zoneIds: [] });
  const loadError = zonesError || localitiesError || savedError;

  const coveredZones = new Set(value.zoneIds);
  groups.forEach((group) => {
    if (group.id !== null && value.localityIds.includes(group.id)) {
      group.zones.forEach((zone) => coveredZones.add(zone.id));
    }
  });
  const noCoverage = value.localityIds.length === 0 && value.zoneIds.length === 0;

  const handleChange = (next) => {
    setMessage(null);
    setSelection(next);
  };

  const handleSave = async () => {
    // RF-05: el área de cobertura necesita al menos una localidad.
    if (noCoverage) {
      setMessage({ type: 'error', text: 'Selecciona al menos una localidad antes de guardar.' });
      return;
    }
    const added = (next, current) => next.filter((id) => !current.includes(id));
    setSaving(true);
    try {
      // Primero se agrega y después se quita, para no dejar la cobertura vacía a mitad del guardado.
      await Promise.all([
        ...added(value.localityIds, saved.localityIds).map((id) => addLocality(profile.id, id)),
        ...added(value.zoneIds, saved.zoneIds).map((id) => addZone(profile.id, id)),
      ]);
      await Promise.all([
        ...added(saved.localityIds, value.localityIds).map((id) => removeLocality(profile.id, id)),
        ...added(saved.zoneIds, value.zoneIds).map((id) => removeZone(profile.id, id)),
      ]);
      await refresh();
      reload();
      setSelection(null);
      setMessage({ type: 'success', text: 'Área de cobertura guardada correctamente.' });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeading
        eyebrow="Dónde trabajas"
        title="Mi área de cobertura"
        description="Elige las localidades a las que puedes desplazarte: cubres todos sus barrios, incluso los que se agreguen después, y los contratantes te encontrarán por ellos."
        action={(
          <Button type="button" disabled={locked || saving || !selection || noCoverage} onClick={handleSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        )}
      />
      {locked && (
        <StatusMessage className={styles.notice} variant="warning">
          Tu perfil está pausado por administración: no puedes editar tu cobertura.
        </StatusMessage>
      )}
      {loadError && <StatusMessage className={styles.notice} variant="error">{loadError}</StatusMessage>}
      {message && <StatusMessage className={styles.notice} variant={message.type}>{message.text}</StatusMessage>}
      <section className={`${ui.infoCard} ${locked ? styles.locked : ''}`} inert={locked}>
        {ready
          ? <LocalityPicker localities={localities} onChange={handleChange} value={value} zones={zones} />
          : !loadError && <p className={styles.coverageSummary}>Cargando localidades…</p>}
        <p className={styles.coverageSummary}>
          {coveredZones.size === 0
            ? 'Aún no cubres ninguna localidad.'
            : `Cubres ${coveredZones.size} ${coveredZones.size === 1 ? 'barrio' : 'barrios'} en total.`}
        </p>
      </section>
    </div>
  );
}

export default CoveragePage;