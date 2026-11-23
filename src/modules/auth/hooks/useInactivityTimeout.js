import { useEffect, useRef } from 'react';
import { clearSession, getSession, saveSession } from '../../core/lib/session';
import { refreshToken } from '../services/authService';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos de inactividad
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // Refrescar si faltan 5 min o menos y hubo actividad
const CHECK_INTERVAL_MS = 15 * 1000; // Evaluar cada 15 segundos
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
const LAST_ACTIVITY_KEY = 'oy_last_activity';

export function recordActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivity() {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? Number(stored) : Date.now();
}

/**
 * Hook global que gestiona la sesión por inactividad:
 * - Detecta actividad del usuario (clic, scroll, teclas).
 * - Si el usuario interactúa, reinicia el tiempo de inactividad y renueva el token
 *   en segundo plano antes de que expire (sesión deslizante).
 * - Si transcurren 15 minutos continuos sin interacción alguna, cierra la sesión.
 */
export function useInactivityTimeout() {
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const session = getSession();
    if (!session?.token) return undefined;

    // Inicializar timestamp de actividad si no existe
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      recordActivity();
    }

    let lastWrite = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle a 2 segundos para no sobrecargar el almacenamiento en eventos frecuentes (scroll/clic)
      if (now - lastWrite > 2000) {
        lastWrite = now;
        recordActivity();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const intervalId = setInterval(async () => {
      const currentSession = getSession();
      if (!currentSession?.token) return;

      const now = Date.now();
      const lastActivity = getLastActivity();
      const idleTime = now - lastActivity;

      // 1. Inactividad prolongada: han pasado 15 minutos sin interacción
      if (idleTime >= INACTIVITY_LIMIT_MS) {
        clearSession();
        window.location.assign('/auth?expired=1');
        return;
      }

      // 2. Usuario activo: si el token actual está próximo a expirar (<= 5 minutos restantes), renovarlo
      const expiresAt = currentSession.expiresAt;
      const timeLeft = expiresAt ? expiresAt - now : 0;

      if (timeLeft <= REFRESH_THRESHOLD_MS && !isRefreshingRef.current) {
        isRefreshingRef.current = true;
        try {
          const fresh = await refreshToken();
          if (fresh?.token) {
            saveSession({
              token: fresh.token,
              userId: fresh.userId || currentSession.userId,
              roles: fresh.roles || currentSession.roles,
              expiresInSeconds: fresh.expiresInSeconds || 900,
            });
            window.dispatchEvent(new Event('oy-session-refreshed'));
          }
        } catch {
          // Si falla momentáneamente por red, se reintentará en el próximo ciclo antes de expirar
        } finally {
          isRefreshingRef.current = false;
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, []);
}
