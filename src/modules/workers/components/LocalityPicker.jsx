import { groupCoverage } from './formats';
import ui from './ui/ui.module.css';
import styles from './worker.module.css';

const plural = (count) => `${count} ${count === 1 ? 'barrio' : 'barrios'}`;

// El trabajador elige localidades; cada una cubre todos sus barrios.
// value = { localityIds, zoneIds }: zoneIds solo guarda los barrios de "Otras" (sin localidad conocida).
function LocalityPicker({ zones, localities, value, onChange, error }) {
  const toggleLocality = (group) => {
    if (value.localityIds.includes(group.id)) {
      onChange({ ...value, localityIds: value.localityIds.filter((item) => item !== group.id) });
      return;
    }
    // Al elegir la localidad, sus barrios sueltos quedan incluidos en ella
    const included = group.zones.map((zone) => zone.id);
    onChange({
      localityIds: [...value.localityIds, group.id],
      zoneIds: value.zoneIds.filter((id) => !included.includes(id)),
    });
  };

  const toggleOthers = (otherZones) => {
    const ids = otherZones.map((zone) => zone.id);
    const allSelected = ids.every((id) => value.zoneIds.includes(id));
    onChange({
      ...value,
      zoneIds: allSelected
        ? value.zoneIds.filter((id) => !ids.includes(id))
        : [...new Set([...value.zoneIds, ...ids])],
    });
  };

  return (
    <fieldset className={`${ui.field} ${styles.fieldset}`}>
      <legend className={ui.fieldLabel}>
        Localidades de cobertura <span aria-hidden="true" className={ui.requiredMark}>*</span>
      </legend>
      <div className={styles.localityGrid}>
        {groupCoverage(zones, localities).map((group) => {
          const isOthers = group.id === null;
          const covered = !isOthers && value.localityIds.includes(group.id)
            ? group.zones
            : group.zones.filter((zone) => value.zoneIds.includes(zone.id));
          const complete = covered.length === group.zones.length;
          return (
            <label
              className={`${styles.localityCard} ${covered.length ? styles.localityActive : ''}`}
              key={group.id ?? 'others'}
            >
              <input
                checked={complete}
                onChange={() => (isOthers ? toggleOthers(group.zones) : toggleLocality(group.id))}
                ref={(input) => { if (input) input.indeterminate = covered.length > 0 && !complete; }}
                type="checkbox"
              />
              <span>
                <strong>{group.name}</strong>
                {covered.length > 0 ? (
                  <small>
                    {complete
                      ? `Cubres ${plural(covered.length)}: `
                      : `Cubres ${covered.length} de ${plural(group.zones.length)}: `}
                    {covered.map((zone) => zone.name).join(', ')}
                  </small>
                ) : (
                  <small>
                    {`Incluye ${plural(group.zones.length)}: `}
                    {group.zones.map((zone) => zone.name).join(', ')}
                  </small>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error
        ? <span className={ui.errorText}>{error}</span>
        : <span className={ui.fieldHint}>Al elegir una localidad cubres todos sus barrios, también los que se agreguen después. Puedes cambiarla en Cobertura.</span>}
    </fieldset>
  );
}

export default LocalityPicker;