import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../../assets/Logo.png';
import { getProfilePhotoUrl } from '../lib/imageService';
import { clearSession, getSession } from '../lib/session';
import { navLinks } from '../lib/moduleRegistry';
import { requestsService } from '../../service/services/requestsService';
import styles from './Navbar.module.css';

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'OY';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'OY';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getFirstName(name) {
  if (!name || typeof name !== 'string') return 'Usuario';
  const first = name.trim().split(/\s+/)[0];
  return first || 'Usuario';
}

const normalizeRole = (role) => String(role).toUpperCase().replace('ROLE_', '');

function dismissedKey(userId) {
  return `oy_notif_dismissed_${userId ?? 'anon'}`;
}

function readDismissed(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(dismissedKey(userId)) ?? '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function markDismissed(userId, key) {
  const keys = readDismissed(userId);
  keys.add(key);
  try {
    localStorage.setItem(dismissedKey(userId), JSON.stringify([...keys]));
  } catch {
    // sin almacenamiento disponible: la baja dura solo mientras dure la página
  }
}

function notificationColorClass(color) {
  if (color === 'blue') return styles.notifBlue;
  if (color === 'warn') return styles.notifWarn;
  return styles.notifPrimary;
}

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuthPage = pathname.startsWith('/auth');
  const [session, setSession] = useState(() => getSession());
  const userRoles = useMemo(
    () => (session?.roles ?? []).map((role) => normalizeRole(role)),
    [session?.roles],
  );
  const isAdmin = userRoles.includes('ADMIN');

  const [userName, setUserName] = useState(
    () => localStorage.getItem('oy_userName') || ''
  );
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function syncProfileName() {
      const stored = localStorage.getItem('oy_userName');
      if (stored) setUserName(stored);
      const currentSession = getSession();
      setSession(currentSession);
      if (currentSession?.userId) {
        getProfilePhotoUrl(currentSession.userId, currentSession.token).then((url) => {
          setAvatarUrl(url);
        });
      }
    }
    syncProfileName();
    window.addEventListener('oy-profile-updated', syncProfileName);
    window.addEventListener('storage', syncProfileName);
    return () => {
      window.removeEventListener('oy-profile-updated', syncProfileName);
      window.removeEventListener('storage', syncProfileName);
    };
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const MENU_ORDER = [
    '/home',
    '/buscar',
    '/nueva-solicitud',
    '/solicitudes',
    '/mis-servicios',
    '/worker',
  ];

  const visibleLinks = navLinks
    .filter((link) => {
      // Quitar 'Mi perfil' del menu para evitar redundancia
      if (link.to === '/users/me') return false;
      // Ocultar 'Registrarse' en el menú superior cuando ya hay sesión activa
      if (session && link.to === '/register') return false;
      if (!link.roles || link.roles.length === 0) return true;
      return link.roles.some((r) => userRoles.includes(String(r).toUpperCase()));
    })
    .sort((a, b) => {
      const idxA = MENU_ORDER.indexOf(a.to);
      const idxB = MENU_ORDER.indexOf(b.to);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

  function handleLogout() {
    setMenuOpen(false);
    localStorage.removeItem('oy_userName');
    clearSession();
    navigate('/auth', { replace: true });
  }

  const loadNotifications = useCallback(() => {
    const items = new Map();
    const tasks = [];
    const roles = userRoles.map(normalizeRole);
    const userId = session?.userId;

    function add(item) {
      // Clave estable: el mismo servicio puede cambiar de estado y pasar a ser una notificación nueva.
      const key = `${item.id}:${item.state}`;
      if (!items.has(key)) items.set(key, { ...item, key });
    }

    if (roles.includes('TRABAJADOR')) {
      tasks.push(
        requestsService
          .listMine('TRABAJADOR')
          .then((list) => {
            (Array.isArray(list) ? list : []).forEach((r) => {
              if (r?.state === 'PENDING') {
                add({
                  id: r.id,
                  state: 'PENDING',
                  title: 'Servicio entrante',
                  description: r.description || 'Nueva reparación cerca de ti',
                  actionLabel: 'Ver solicitud',
                  link: `/mis-servicios?request=${r.id}`,
                  color: 'blue',
                });
              }
              if (r?.state === 'CONFLICT') {
                add({
                  id: r.id,
                  state: 'CONFLICT',
                  title: 'Servicio en disputa',
                  description: 'Dos trabajadores aceptaron; el contratante está eligiendo.',
                  actionLabel: 'Ver estado',
                  link: `/mis-servicios?request=${r.id}`,
                  color: 'warn',
                });
              }
              if (r?.state === 'COMPLETED') {
                add({
                  id: r.id,
                  state: 'COMPLETED',
                  title: 'Califica al contratante',
                  description: 'El servicio quedó completado. Cuéntanos cómo fue.',
                  actionLabel: 'Calificar servicio',
                  link: `/solicitudes?calificar=${r.id}`,
                  color: 'primary',
                });
              }
            });
          })
          .catch(() => {}),
      );
    }

    if (roles.includes('CONTRATANTE')) {
      tasks.push(
        requestsService
          .listMine('CONTRATANTE')
          .then((list) => {
            const all = Array.isArray(list) ? list : [];
            const conflictRoots = new Set(
              all.filter((r) => r?.state === 'CONFLICT' && r?.rootId).map((r) => r.rootId),
            );
            conflictRoots.forEach((rootId) => {
              add({
                id: `conflict-${rootId}`,
                state: 'CONFLICT',
                title: 'Disputa por resolver',
                description: 'Dos trabajadores aceptaron tu solicitud. Elige cuál continúa.',
                actionLabel: 'Elegir trabajador',
                link: `/solicitudes?conflict=${rootId}`,
                color: 'warn',
              });
            });
            all
              .filter((r) => r?.state === 'ACCEPTED' && !conflictRoots.has(r?.rootId))
              .forEach((r) =>
                add({
                  id: r.id,
                  state: 'ACCEPTED',
                  title: 'Solicitud aceptada',
                  description: r.description || 'Un trabajador aceptó tu solicitud.',
                  actionLabel: 'Ver solicitud',
                  link: `/solicitudes?request=${r.id}`,
                  color: 'blue',
                }),
              );
            all
              .filter((r) => r?.state === 'COMPLETED')
              .forEach((r) =>
                add({
                  id: r.id,
                  state: 'COMPLETED',
                  title: 'Trabajo completado',
                  description: 'El trabajador marcó el servicio como terminado.',
                  actionLabel: 'Calificar el servicio',
                  link: `/solicitudes?calificar=${r.id}`,
                  color: 'primary',
                }),
              );
          })
          .catch(() => {}),
      );
    }

    const dismissed = readDismissed(userId);
    Promise.all(tasks).then(() => {
      setNotifItems([...items.values()].filter((item) => !dismissed.has(item.key)));
    });
  }, [session?.userId, userRoles]);

  useEffect(() => {
    loadNotifications();
    function refresh() {
      loadNotifications();
    }
    function onRated(event) {
      const id = event.detail?.id;
      if (id) markDismissed(session?.userId, `${id}:COMPLETED`);
      loadNotifications();
    }
    const events = ['oy-requests-changed', 'oy-profile-updated'];
    events.forEach((event) => window.addEventListener(event, refresh));
    window.addEventListener('oy-request-rated', onRated);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      events.forEach((event) => window.removeEventListener(event, refresh));
      window.removeEventListener('oy-request-rated', onRated);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadNotifications, session?.userId]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setDrawerOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className={styles.navbar}>
      <div className={styles.leftArea}>
        {!isAuthPage && (
          <button
            type="button"
            className={styles.hamburgerBtn}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={drawerOpen}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <Link to={session ? '/home' : '/'} aria-label="OficioYa" className={styles.brandLink}>
          <img src={logo} alt="OficioYa" className={styles.logo} />
        </Link>
      </div>

      {/* Acceso a cuenta / perfil a la derecha */}
      {!isAuthPage && (
        <div className={styles.rightArea}>
          {session && (
            <div className={styles.notifWrap} ref={notifRef}>
              <button
                type="button"
                className={styles.notifBtn}
                onClick={() => {
                  if (!notifOpen) loadNotifications();
                  setNotifOpen((prev) => !prev);
                }}
                aria-label="Notificaciones"
                aria-expanded={notifOpen}
              >
                <BellIcon />
                {notifItems.length > 0 && (
                  <span className={styles.notifBadge}>{notifItems.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className={styles.notifDropdown} role="dialog" aria-label="Notificaciones">
                  {notifItems.length === 0 ? (
                    <p className={styles.notifEmpty}>Sin notificaciones nuevas</p>
                  ) : (
                    notifItems.map((item) => (
                      <div
                        key={item.key}
                        className={`${styles.notifItem} ${notificationColorClass(item.color)}`}
                      >
                        <span className={styles.notifItemTitle}>{item.title}</span>
                        <span className={styles.notifItemDesc}>{item.description}</span>
                        <button
                          type="button"
                          className={styles.notifActionBtn}
                          onClick={() => {
                            markDismissed(session?.userId, item.key);
                            setNotifOpen(false);
                            setNotifItems((prev) => prev.filter((n) => n.key !== item.key));
                            navigate(item.link);
                          }}
                        >
                          {item.actionLabel}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {session && (
            <div className={styles.accountWrap} ref={menuRef}>
              <button
                type="button"
                className={styles.accountBtn}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
              >
                <span className={styles.avatar}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className={styles.avatarImg} />
                  ) : (
                    getInitials(userName)
                  )}
                </span>
                <span className={styles.accountText}>
                  <span className={styles.accountName}>{getFirstName(userName)}</span>
                  <span className={styles.accountSub}>
                    Mi cuenta
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </span>
              </button>

                {menuOpen && (
                  <div className={styles.dropdown}>
                    <Link
                      to="/users/me"
                      className={styles.dropdownItem}
                      onClick={() => setMenuOpen(false)}
                    >
                      Ver mi perfil
                    </Link>
                    <Link
                      to="/users/me/edit"
                      className={styles.dropdownItem}
                      onClick={() => setMenuOpen(false)}
                    >
                      Editar perfil
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin/users"
                        className={styles.dropdownItem}
                        onClick={() => setMenuOpen(false)}
                      >
                        Gestión de usuarios
                      </Link>
                    )}
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.logoutItem}`}
                      onClick={handleLogout}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
          )}
        </div>
      )}

      {/* Drawer lateral en pantallas pequeñas */}
      {!isAuthPage && drawerOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setDrawerOpen(false)}
          role="presentation"
        >
          <aside
            className={styles.drawer}
            onClick={(e) => e.stopPropagation()}
            aria-label="Menú principal de navegación"
          >
            <div className={styles.drawerHeader}>
              <img src={logo} alt="OficioYa" className={styles.drawerLogo} />
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className={styles.drawerLinks}>
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    isActive
                      ? `${styles.drawerLink} ${styles.drawerActive}`
                      : styles.drawerLink
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {session && (
              <div className={styles.drawerFooter}>
                <div className={styles.drawerUser}>
                  <span className={styles.avatar}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className={styles.avatarImg} />
                    ) : (
                      getInitials(userName)
                    )}
                  </span>
                  <div>
                    <div className={styles.accountName}>{userName || 'Usuario'}</div>
                    <div className={styles.accountSub}>Sesión iniciada</div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </header>
  );
}

export default Navbar;
