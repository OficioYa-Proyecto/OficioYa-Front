import { useLayoutEffect, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../../core/design-system/Button';
import { getToken } from '../../core/lib/session';
import { DETAILS_FORM_ID, SENT_STEP, STEPS, WORKERS_FORM_ID } from '../config';
import { useCreateRequest } from '../hooks/useCreateRequest';
import { warmWorkerIds } from '../hooks/useWorkerPhoto';
import { EMPTY_FORM } from '../requestForm';
import { localitiesService } from '../services/localitiesService';
import { workersService } from '../services/workersService';
import { zonesService } from '../services/zonesService';
import '../theme.css';
import { BellIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import RequestDetailsStep from './RequestDetailsStep';
import RequestStepper from './RequestStepper';
import ReviewStep from './ReviewStep';
import SentStep from './SentStep';
import WorkersStep from './WorkersStep';
import styles from './CreateRequestPage.module.css';

const REVIEW = STEPS.length;
const SENT = STEPS.length + 1;
const THEME = 'naranja';
const STEP_FORMS = { 1: DETAILS_FORM_ID, 2: WORKERS_FORM_ID };
const SENT_ACTIONS_STYLE = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'flex-end',
};

function sendLabel(count) {
  return count === 1 ? 'Enviar al trabajador' : `Enviar a ${count} trabajadores`;
}

function CreateRequestPage() {
  const [token] = useState(() => getToken() ?? '');
  const navigate = useNavigate();
  const { workerId: preselectedWorkerId } = useParams();
  // El perfil del trabajador (botón Contratar) envía su nombre y oficio; /workers no trae el nombre.
  const { state: fromProfile } = useLocation();
  const [step, setStep] = useState(1);
  // Desde el botón Contratar, el oficio del trabajador llega preseleccionado (se puede cambiar).
  const [form, setForm] = useState(() =>
    preselectedWorkerId && fromProfile?.oficioId
      ? { ...EMPTY_FORM, tradeId: fromProfile.oficioId, trade: fromProfile.oficio ?? '' }
      : EMPTY_FORM,
  );
  const [preselectedWorker, setPreselectedWorker] = useState(null);
  // Al elegir "buscar otros trabajadores" se ignora el trabajador del perfil, pero se conservan oficio y barrio.
  const [searchingOthers, setSearchingOthers] = useState(false);
  const hasPreselection = Boolean(preselectedWorkerId) && !searchingOthers;
  const { sending, error: sendError, result, send, reset } = useCreateRequest(token);
  // La confirmación se muestra de inmediato; el envío real termina en segundo plano.
  const [pendingResult, setPendingResult] = useState(null);
  const sentResult = result ?? pendingResult;

  useEffect(() => {
    warmWorkerIds();
  }, []);

  useEffect(() => {
    if (!hasPreselection) return;
    workersService.lookup().then((ws) => {
      const found = ws.find((x) => x.id === preselectedWorkerId);
      const w = found && {
        ...found,
        name: fromProfile?.nombre || found.name,
        trade: fromProfile?.oficio || found.trade,
      };
      if (w) {
        setPreselectedWorker(w);
        setForm((current) => ({ ...current, workers: [w] }));
      }
    }).catch(() => {});
  }, [hasPreselection, preselectedWorkerId, fromProfile?.nombre, fromProfile?.oficio]);

  // Desde el botón Contratar: la localidad y el primer barrio donde trabaja quedan preseleccionados.
  const profileZoneIds = hasPreselection ? fromProfile?.zonaIds : null;
  // Desde Contratar el oficio queda bloqueado y la localidad se limita a las del trabajador.
  const locked = {
    trade: Boolean(hasPreselection && fromProfile?.oficioId),
    zoneIds: Array.isArray(profileZoneIds) && profileZoneIds.length > 0 ? profileZoneIds : null,
    // Fecha y hora limitadas a las franjas que publicó el trabajador (si no publicó ninguna, no se limita).
    schedule: hasPreselection && Array.isArray(fromProfile?.franjas) && fromProfile.franjas.length > 0
      ? fromProfile.franjas
      : null,
  };
  useEffect(() => {
    if (!Array.isArray(profileZoneIds) || profileZoneIds.length === 0) return;
    Promise.all([zonesService.list(), localitiesService.list()]).then(([zones, localidades]) => {
      const zone = zones.find((item) => profileZoneIds.includes(item.id));
      if (!zone) return;
      const locality = localidades.find((item) => item.name === zone.locality);
      setForm((current) => (current.neighborhood
        ? current
        : {
          ...current,
          localityId: locality ? String(locality.id) : '',
          locality: zone.locality || '',
          neighborhood: zone.name,
          zoneIds: zones.filter((item) => profileZoneIds.includes(item.id)).map((item) => item.id),
        }));
    }).catch(() => {});
    // Los ids llegan una sola vez desde el perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(profileZoneIds)]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = THEME;
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const meta = step === SENT ? SENT_STEP : STEPS[step - 1];
  const canGoBack = step < SENT && !sending;
  // En el paso 1 la flecha vuelve a la página anterior (por ejemplo, el perfil del trabajador).
  const handleBack = () => {
    if (step > 1) {
      goBack();
    } else if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  const goBack = () => setStep((s) => {
    if (preselectedWorker && !searchingOthers && s === REVIEW) return 1;
    return Math.max(s - 1, 1);
  });
  const goNext = () => setStep((s) => {
    if (s === 1 && hasPreselection) return REVIEW;
    return Math.min(s + 1, SENT);
  });
  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const handleSend = async () => {
    setPendingResult({ sent: form.workers.length, pending: true });
    setStep(SENT);
    const ok = await send(form);
    setPendingResult(null);
    // Si el envío falla, volvemos a la revisión con el error del hook.
    if (!ok) {
      setStep(REVIEW);
    }
  };
  const searchOtherWorkers = () => {
    setPreselectedWorker(null);
    setSearchingOthers(true);
    setForm((current) => ({ ...current, workers: [] }));
    setStep(2);
  };
  const restart = () => {
    reset();
    setPendingResult(null);
    setPreselectedWorker(null);
    setSearchingOthers(false);
    setForm(EMPTY_FORM);
    setStep(1);
    // Al volver a una solicitud nueva se quita el trabajador del perfil: el oficio vuelve a ser editable.
    navigate('/nueva-solicitud', { replace: true, state: null });
  };

  const primaryAction =
    step === REVIEW
      ? { onClick: handleSend, disabled: sending }
      : { type: 'submit', form: STEP_FORMS[step] };
  const primaryLabel =
    step === REVIEW ? (sending ? 'Enviando…' : sendLabel(form.workers.length)) : meta.cta;
  const PrimaryIcon = step === REVIEW ? BellIcon : ChevronRightIcon;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={handleBack}
          disabled={!canGoBack}
          aria-label="Volver al paso anterior"
        >
          <ChevronLeftIcon />
        </button>
        <div className={styles.heading}>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h1>{meta.title}</h1>
        </div>
      </header>

      <RequestStepper
        steps={STEPS}
        current={Math.min(step, STEPS.length)}
        progressLabel={meta.progressLabel}
      />

      <section className={styles.body}>
        {step === 1 && <RequestDetailsStep values={form} onChange={updateForm} onSubmit={goNext} locked={locked} />}
        {step === 2 && (
          <WorkersStep
            values={form}
            onChange={updateForm}
            onSubmit={goNext}
            onEditRequest={goBack}
          />
        )}
        {preselectedWorker && step === REVIEW && (
          <p className={styles.info}>
            Trabajador seleccionado: {preselectedWorker.name}. También puedes buscar otros trabajadores con este
            oficio y barrio.
          </p>
        )}
        {step === REVIEW && (
          <ReviewStep values={form} onEditWorkers={goBack} busy={sending} error={sendError} />
        )}
        {step === SENT && sentResult && (
          <SentStep values={form} result={sentResult} pending={Boolean(sentResult.pending)} />
        )}
      </section>

      <footer className={styles.footer}>
        {step === SENT ? (
          <div style={SENT_ACTIONS_STYLE}>
            <Button variant="secondary" onClick={restart}>
              {meta.cta}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Ir a inicio
            </Button>
            <Button onClick={() => navigate('/solicitudes')}>Ver mis solicitudes</Button>
          </div>
        ) : (
          <div style={SENT_ACTIONS_STYLE}>
            {step === REVIEW && hasPreselection && (
              <Button variant="secondary" onClick={searchOtherWorkers}>
                Buscar otros trabajadores
              </Button>
            )}
            <Button {...primaryAction}>
              {primaryLabel}
              <PrimaryIcon size={18} />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}

export default CreateRequestPage;