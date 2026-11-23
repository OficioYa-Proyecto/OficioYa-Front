import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { clearSession, getSession, saveSession } from '../../core/lib/session';
import { refreshToken } from '../services/authService';

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutos exactos de inactividad
const MIN_REFRESH_INTERVAL_MS = 60 * 1000; // Refrescar máximo 1 vez por minuto si hubo actividad nueva
const CHECK_INTERVAL_MS = 5 * 1000; // Evaluar cada 5 segundos
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
const LAST_ACTIVITY_KEY = 'oy_last_activity';

export function recordActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivity() {
  const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
  return stored ? Number(stored) : Date.now();
}

function expireAndRedirect() {
  clearSession();
  if (!window.location.pathname.startsWith('/auth')) {
    window.location.assign('/auth?expired=1');
  }
}

/**
 * Hook global que gestiona la sesión por inactividad:
 * - Se activa en cualquier ruta autenticada (y se re-vincula al cambiar de ruta tras el login).
 * - Si el usuario interactúa, reinicia el contador de 15 minutos y sincroniza el token con el backend.
 * - Si transcurren 15 minutos continuos sin interacción alguna, limpia la sesión y redirige a /auth?expired=1.
 */
export function useInactivityTimeout() {
  const { pathname } = useLocation();
  const isRefreshingRef = useRef(false);
  const lastRefreshedActivityRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);

  useEffect(() => {
    const isAuthPage = pathname.startsWith('/auth');
    if (isAuthPage) return undefined;

    const session = getSession();
    if (!session?.token) return undefined;

    const nowInit = Date.now();
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      recordActivity();
    }
    if (lastRefreshedActivityRef.current === 0) {
      lastRefreshedActivityRef.current = getLastActivity();
      lastRefreshTimeRef.current = nowInit;
    }

    let lastWrite = 0;
    const handleUserActivity = () => {
      if (!localStorage.getItem('oy_token')) return;
      const now = Date.now();
      const lastActivity = getLastActivity();

      // Si el usuario vuelve después de 15+ minutos inactivo, cerrar sesión de inmediato sin reiniciar el reloj
      if (now - lastActivity >= INACTIVITY_LIMIT_MS) {
        expireAndRedirect();
        return;
      }

      if (now - lastWrite > 2000) {
        lastWrite = now;
        recordActivity();
      }
    };

    const evaluateSession = async () => {
      const hasRawToken = Boolean(localStorage.getItem('oy_token'));
      const currentSession = getSession();

      // Si había sesión o estamos en ruta protegida y el token ya venció
      if (!currentSession?.token) {
        if (hasRawToken || !window.location.pathname.startsWith('/auth')) {
          expireAndRedirect();
        }
        return;
      }

      const now = Date.now();
      const lastActivity = getLastActivity();
      const idleTime = now - lastActivity;

      // 1. Inactividad alcanzada (15 minutos sin actividad): sacar de la sesión inmediatamente
      if (idleTime >= INACTIVITY_LIMIT_MS) {
        expireAndRedirect();
        return;
      }

      // 2. Si hubo actividad nueva desde el último refresh y ya pasó al menos 1 minuto,
      // renovar el JWT en segundo plano para alinear su vigencia con los 15 min desde la última actividad
      const hadNewActivity = lastActivity > lastRefreshedActivityRef.current + 2000;
      const cooldownPassed = now - lastRefreshTimeRef.current >= MIN_REFRESH_INTERVAL_MS;
      const expiresAt = currentSession.expiresAt;
      const timeLeft = expiresAt ? expiresAt - now : INACTIVITY_LIMIT_MS;

      if ((hadNewActivity && cooldownPassed) || (hadNewActivity && timeLeft <= 5 * 60 * 1000)) {
        if (!isRefreshingRef.current) {
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
              lastRefreshedActivityRef.current = lastActivity;
              lastRefreshTimeRef.current = Date.now();
              window.dispatchEvent(new Event('oy-session-refreshed'));
            }
          } catch {
            // Si el backend rechaza el refresh con 401, httpClient redirigirá automáticamente a /auth?expired=1
          } finally {
            isRefreshingRef.current = false;
          }
        }
      }
    };

    const handleExpiredEvent = () => {
      expireAndRedirect();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        evaluateSession();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });
    window.addEventListener('oy-session-expired', handleExpiredEvent);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const intervalId = setInterval(evaluateSession, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('oy-session-expired', handleExpiredEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [pathname]);
}
