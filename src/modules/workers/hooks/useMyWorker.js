import { useSyncExternalStore } from 'react';
import { getMyWorker, updateAvailableNow } from '../services/workersService';
import { getToken } from '../../core/lib/session';

// Perfil del trabajador en sesión, compartido por todas las pantallas (layout, panel, oficios, home...).
// Se consulta una sola vez; después de cada cambio la pantalla llama refresh().
let state = { data: null, loading: true, error: null };
let started = false;
let lastToken = null;
const listeners = new Set();

function setState(changes) {
  state = { ...state, ...changes };
  listeners.forEach((listener) => listener());
}

export async function refreshMyWorker() {
  lastToken = getToken() || null;
  if (!lastToken) {
    setState({ data: null, loading: false, error: null });
    return;
  }
  try {
    setState({ data: await getMyWorker(), loading: false, error: null });
  } catch (error) {
    setState({ loading: false, error: error.message });
  }
}

export async function toggleMyWorkerAvailableNow() {
  if (!state.data?.id) return;
  const workerId = state.data.id;
  const previous = Boolean(state.data.availableNow);
  const next = !previous;

  // Actualización optimista inmediata (0 ms de espera visual)
  setState({ data: { ...state.data, availableNow: next } });

  try {
    await updateAvailableNow(workerId, next);
  } catch (error) {
    // Si falla la petición, revertimos al estado anterior
    if (state.data?.id === workerId) {
      setState({ data: { ...state.data, availableNow: previous } });
    }
    throw error;
  }
}

function subscribe(listener) {
  listeners.add(listener);
  const currentToken = getToken() || null;
  if (!started || currentToken !== lastToken) {
    started = true;
    refreshMyWorker();
  }
  return () => listeners.delete(listener);
}

// Lectura sin suscribirse (la usa el menú de cuenta del Navbar).
export function getMyWorkerState() {
  return state;
}

// data = WorkerResponse, o null si el usuario aún no tiene perfil.
export function useMyWorker() {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return {
    ...snapshot,
    refresh: refreshMyWorker,
    toggleAvailableNow: toggleMyWorkerAvailableNow,
  };
}
