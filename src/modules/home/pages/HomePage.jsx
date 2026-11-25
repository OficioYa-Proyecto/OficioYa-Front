import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, saveSession } from '../../core/lib/session';

import * as profileService from '../../users/services/profileService';
import { useMyWorker } from '../../workers/hooks/useMyWorker';
import { useProfilePhoto } from '../../workers/hooks/useProfilePhoto';
import styles from './HomePage.module.css';

/* ─── SVG Icons ─── */
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function UserIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldCheckIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckCircleIcon({ color = '#d65b38' } = {}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const POPULAR_TRADES = [
  'Plomería',
  'Electricidad',
  'Pintura',
  'Carpintería',
  'Cerrajería',
  'Jardinería',
  'Reparaciones',
  'Mudanzas',
];

function normalizeRoles(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((r) => String(r).toUpperCase());
}

function getFirstName(fullName, fallback = 'Usuario') {
  if (!fullName || typeof fullName !== 'string') return fallback;
  const trimmed = fullName.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0];
}

export default function HomePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [roles, setRoles] = useState(() => normalizeRoles(session?.roles));
  const [profileName, setProfileName] = useState(() => localStorage.getItem('oy_userName') || '');
  const [userProfile, setUserProfile] = useState(null);
  const [addingRole, setAddingRole] = useState(false);
  const [howItWorksTab, setHowItWorksTab] = useState('contratar');

  const { data: workerProfile, toggleAvailableNow } = useMyWorker();
  const isAvailableNow = Boolean(workerProfile?.availableNow);
  const photoUrl = useProfilePhoto(session?.userId);

  useEffect(() => {
    let active = true;
    profileService
      .obtenerMiPerfil(session?.token)
      .then((data) => {
        if (!active || !data) return;
        setUserProfile(data);
        if (data.name) {
          setProfileName(data.name);
          localStorage.setItem('oy_userName', data.name);
          window.dispatchEvent(new Event('oy-profile-updated'));
        }
        if (Array.isArray(data.roles) && data.roles.length > 0) {
          const normalized = normalizeRoles(data.roles);
          setRoles(normalized);
        }
      })
      .catch(() => {
        // Si falla la carga silenciosa del perfil, conservamos los roles de la sesión
      });
    return () => {
      active = false;
    };
  }, [session?.token]);

  const isAdmin = roles.includes('ADMIN');
  const isContratante = roles.includes('CONTRATANTE');
  const isTrabajador = roles.includes('TRABAJADOR');
  const isBoth = isContratante && isTrabajador;



  const firstName = getFirstName(profileName, '');

  const tips = [
    {
      id: 'photo',
      title: 'Agrega una foto de perfil',
      done: Boolean(photoUrl || userProfile?.photoUrl || localStorage.getItem('oy_avatar')),
      link: '/users/me/edit',
    },
    {
      id: 'experience',
      title: 'Describe tu experiencia',
      done: Boolean(
        workerProfile?.primaryTrade ||
        (workerProfile?.trades && workerProfile.trades.length > 0) ||
        workerProfile?.description?.trim() ||
        (workerProfile?.experienceYears && workerProfile.experienceYears > 0)
      ),
      link: workerProfile?.id ? '/worker/profile' : '/worker/create',
    },
    {
      id: 'zones',
      title: 'Indica tu zona de trabajo',
      done: Boolean(
        (workerProfile?.zoneIds && workerProfile.zoneIds.length > 0) ||
        (workerProfile?.zones && workerProfile.zones.length > 0)
      ),
      link: workerProfile?.id ? '/worker/coverage' : '/worker/create',
    },
    {
      id: 'availability',
      title: 'Mantén tu disponibilidad al día',
      done: Boolean(
        workerProfile?.availableNow ||
        (workerProfile?.availabilitySlots && workerProfile.availabilitySlots.length > 0)
      ),
      link: workerProfile?.id ? '/worker/availability' : '/worker/create',
    },
  ];

  const completedTips = tips.filter((t) => t.done).length;
  const progressPercent = Math.round((completedTips / tips.length) * 100);

  function handleToggleAvailability() {
    if (!workerProfile?.id) {
      navigate('/worker/create');
      return;
    }
    toggleAvailableNow().catch(() => {});
  }

  async function handleAddRole(targetRole) {
    if (addingRole) return;
    setAddingRole(true);
    try {
      const updated = await profileService.agregarRol(targetRole, session?.token);
      const nextRoles = normalizeRoles(
        updated?.roles?.length ? updated.roles : [...roles, targetRole]
      );
      setRoles(nextRoles);
      const current = getSession();
      if (current) {
        saveSession({
          token: updated?.token || current.token,
          userId: current.userId,
          roles: nextRoles,
        });
        window.dispatchEvent(new Event('oy-profile-updated'));
      }
    } catch {
      const nextRoles = Array.from(new Set([...roles, targetRole]));
      setRoles(nextRoles);
    } finally {
      setAddingRole(false);
    }
  }

  /* ─────────────────────────────────────────────────────────────────
   * 1. HOME ADMINISTRADOR
   * ───────────────────────────────────────────────────────────────── */
  if (isAdmin) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrowPill}>PANEL DE ADMINISTRACIÓN</span>
            <h1 className={styles.heroTitle}>{firstName ? `Hola, ${firstName}` : 'Hola'}</h1>
            <p className={styles.heroSubtitle}>Esto es lo que necesita atención hoy.</p>
            <span className={styles.adminBadgeInline}>
              <ShieldCheckIcon size={14} />
              Administrador
            </span>
          </div>
        </section>

        {/* KPIs */}
        <section className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconBox}>
              <UserIcon size={22} />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiLabel}>Perfiles por verificar</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>18</span>
                <span className={styles.kpiNote}>+4 hoy</span>
              </div>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIconBox}>
              <ClipboardIcon />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiLabel}>Reportes abiertos</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>7</span>
                <span className={styles.kpiNote}>2 prioritarios</span>
              </div>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiIconBox}>
              <ShieldCheckIcon size={22} />
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiLabel}>Casos resueltos</span>
              <div className={styles.kpiValueRow}>
                <span className={styles.kpiValue}>126</span>
                <span className={styles.kpiNote}>Este mes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Acciones de Administración */}
        <section className={styles.grid3}>
          <Link to="/admin/users" className={styles.actionCard}>
            <div>
              <div className={styles.iconBox}>
                <UserIcon size={22} />
              </div>
              <h2 className={styles.cardTitle}>Verificar perfiles</h2>
              <p className={styles.cardDesc}>
                Revisa identidad y datos de nuevos trabajadores.
              </p>
            </div>
            <span className={styles.cardLink}>
              Abrir <ChevronRightIcon />
            </span>
          </Link>

          <Link to="/admin/moderacion" className={styles.actionCard}>
            <div>
              <div className={styles.iconBox}>
                <ClipboardIcon />
              </div>
              <h2 className={styles.cardTitle}>Gestionar reportes</h2>
              <p className={styles.cardDesc}>
                Atiende reseñas y perfiles reportados.
              </p>
            </div>
            <span className={styles.cardLink}>
              Abrir <ChevronRightIcon />
            </span>
          </Link>

          <Link to="/admin/users" className={styles.actionCard}>
            <div>
              <div className={styles.iconBox}>
                <SearchIcon />
              </div>
              <h2 className={styles.cardTitle}>Buscar usuario</h2>
              <p className={styles.cardDesc}>
                Consulta los datos completos de cualquier cuenta.
              </p>
            </div>
            <span className={styles.cardLink}>
              Abrir <ChevronRightIcon />
            </span>
          </Link>
        </section>

        {/* Casos prioritarios */}
        <section className={styles.priorityCard}>
          <div className={styles.priorityHeader}>
            <div className={styles.priorityTitleWrap}>
              <span className={styles.eyebrowPill}>URGENTE</span>
              <h2 className={styles.priorityTitle}>Casos prioritarios</h2>
            </div>
            <button type="button" className={styles.outlinePillBtn}>
              Ver cola completa
            </button>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>USUARIO</th>
                <th>MOTIVO</th>
                <th>ESTADO</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className={styles.userName}>Sandra Gómez</span>
                  <span className={styles.userRoleSub}>Contratante</span>
                </td>
                <td className={styles.reasonCell}>Reseña reportada</td>
                <td>
                  <span className={styles.badgePriority}>Prioritario</span>
                </td>
                <td>
                  <button type="button" className={styles.reviewAction}>
                    Revisar
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <span className={styles.userName}>Diego Ramírez</span>
                  <span className={styles.userRoleSub}>Trabajador · Electricista</span>
                </td>
                <td className={styles.reasonCell}>Verificar identidad</td>
                <td>
                  <span className={styles.badgePending}>Pendiente</span>
                </td>
                <td>
                  <button type="button" className={styles.reviewAction}>
                    Revisar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 2. HOME CONTRATANTE + TRABAJADOR (AMBOS ROLES - propuesta Figma)
   * ───────────────────────────────────────────────────────────────── */
  if (isBoth) {
    return (
      <div className={styles.page}>
        {/* 1. Hero Banner */}
        <section className={styles.heroContratante}>
          <div className={styles.heroDecoCircle1} aria-hidden="true" />
          <div className={styles.heroDecoCircle2} aria-hidden="true" />

          <div className={styles.heroTopRow}>
            <span className={styles.eyebrowText}>INICIO</span>
            <div className={styles.dualRolePill}>
              <span className={styles.dualRolePillActive}>Contratante</span>
              <span className={styles.dualRolePillSecondary}>Trabajador</span>
            </div>
          </div>

          <h1 className={styles.heroTitleContratante}>
            Hola, <span className={styles.heroNameHighlight}>{firstName || 'Usuario'}</span>
          </h1>

          <p className={styles.heroDescContratante}>
            Contrata a personas de confianza o recibe solicitudes para tu oficio, todo con la misma cuenta.
          </p>

          <div className={styles.heroActions}>
            <Link to="/buscar" className={styles.primaryPillBtn}>
              <span>Buscar un oficio</span>
              <ArrowRightIcon />
            </Link>
            <Link to="/worker/dashboard" className={styles.secondaryPillBtn}>
              Mi perfil de trabajo
            </Link>
          </div>
        </section>

        {/* 2. ¿Qué quieres hacer hoy? (Doble Columna: Contratar + Trabajar) */}
        <section className={styles.bothRolesSection}>
          <div className={styles.todayHeader}>
            <h2 className={styles.todayTitle}>¿Qué quieres hacer hoy?</h2>
            <p className={styles.todaySubtitle}>Cambia entre tus dos roles cuando quieras.</p>
          </div>

          <div className={styles.bothRolesGrid}>
            {/* Columna Izquierda: Quiero contratar */}
            <div className={styles.roleCardContratar}>
              <span className={styles.roleBadgeContratante}>CONTRATANTE</span>
              <h3 className={styles.roleCardTitle}>Quiero contratar</h3>
              <p className={styles.roleCardSubtitle}>
                Encuentra personas de confianza y sigue tus solicitudes.
              </p>

              <div className={styles.innerActionList}>
                <Link to="/buscar" className={styles.innerActionRow}>
                  <div className={styles.innerActionLeft}>
                    <div className={styles.innerActionIconBoxPeach}>
                      <SearchIcon />
                    </div>
                    <div>
                      <h4 className={styles.innerActionTitle}>Buscar un oficio</h4>
                      <p className={styles.innerActionDesc}>
                        Plomeros, electricistas, carpinteros y más cerca de ti.
                      </p>
                    </div>
                  </div>
                  <div className={styles.circleArrowPeach}>
                    <ArrowRightIcon />
                  </div>
                </Link>

                <Link to="/solicitudes" className={styles.innerActionRow}>
                  <div className={styles.innerActionLeft}>
                    <div className={styles.innerActionIconBoxPeach}>
                      <ClipboardIcon />
                    </div>
                    <div>
                      <h4 className={styles.innerActionTitle}>Mis servicios</h4>
                      <p className={styles.innerActionDesc}>
                        Mira el estado de tus solicitudes y retómalas.
                      </p>
                    </div>
                  </div>
                  <div className={styles.circleArrowPeach}>
                    <ArrowRightIcon />
                  </div>
                </Link>
              </div>

              <div className={styles.subPopularTrades}>
                <span className={styles.subPopularLabel}>Oficios populares</span>
                <div className={styles.subTradesChips}>
                  {POPULAR_TRADES.slice(0, 4).map((trade) => (
                    <Link
                      key={trade}
                      to={`/buscar?q=${encodeURIComponent(trade)}`}
                      className={styles.tradeChip}
                    >
                      <span className={styles.tradeDot} aria-hidden="true" />
                      <span>{trade}</span>
                    </Link>
                  ))}
                  <Link to="/buscar" className={styles.tradeChipMore}>
                    <span>Ver todos</span>
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Quiero trabajar */}
            <div className={styles.roleCardTrabajar}>
              <span className={styles.roleBadgeTrabajador}>TRABAJADOR</span>
              <h3 className={styles.roleCardTitle}>Quiero trabajar</h3>
              <p className={styles.roleCardSubtitle}>
                Muestra tu oficio y recibe solicitudes de personas cerca de ti.
              </p>

              <div className={styles.innerActionList}>
                <Link to="/worker/profile" className={styles.innerActionRow}>
                  <div className={styles.innerActionLeft}>
                    <div className={styles.innerActionIconBoxBlue}>
                      <WrenchIcon />
                    </div>
                    <div>
                      <h4 className={styles.innerActionTitle}>Mi perfil de trabajo</h4>
                      <p className={styles.innerActionDesc}>
                        Así te ven quienes buscan tu oficio.
                      </p>
                    </div>
                  </div>
                  <div className={styles.circleArrowBlue}>
                    <ArrowRightIcon />
                  </div>
                </Link>

                <div className={styles.innerActionRowStatic}>
                  <Link
                    to="/worker/availability"
                    className={styles.innerActionLeft}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className={styles.innerActionIconBoxBlue}>
                      <ClockIcon />
                    </div>
                    <div>
                      <h4 className={styles.innerActionTitle}>Disponibilidad</h4>
                      <p className={styles.innerActionDesc}>
                        Dile a la gente cuándo puedes trabajar.
                      </p>
                    </div>
                  </Link>
                  <div className={styles.switchCol}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAvailableNow}
                      disabled={workerProfile?.status === 'PAUSED'}
                      onClick={() => {
                        if (!workerProfile?.id) {
                          navigate('/worker/create');
                          return;
                        }
                        toggleAvailableNow().catch(() => {});
                      }}
                      className={`${styles.toggleSwitch} ${isAvailableNow ? styles.toggleSwitchActive : ''}`}
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                    <span className={styles.switchLabel}>
                      {isAvailableNow ? 'Disponible' : 'No disponible'}
                    </span>
                  </div>
                </div>

                {/* Progress bar card */}
                <Link to="/worker/profile" className={styles.progressCard}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressText}>Tu perfil de trabajo</span>
                    <span className={styles.progressPercent}>{progressPercent}%</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
                  </div>
                </Link>

                {/* Notificaciones movidas a la campanita del navbar */}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Así funciona OficioYa con pestañas interactivas */}
        <section id="como-funciona" className={styles.howItWorksSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Así funciona OficioYa</h2>
            <p className={styles.sectionSubtitle}>Una cuenta, dos formas de usarla.</p>
          </div>

          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabPill} ${howItWorksTab === 'contratar' ? styles.tabPillActive : ''}`}
              onClick={() => setHowItWorksTab('contratar')}
            >
              Para contratar
            </button>
            <button
              type="button"
              className={`${styles.tabPill} ${howItWorksTab === 'trabajar' ? styles.tabPillActive : ''}`}
              onClick={() => setHowItWorksTab('trabajar')}
            >
              Para trabajar
            </button>
          </div>

          {howItWorksTab === 'contratar' ? (
            <div className={styles.howItWorksGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBox}>
                    <SearchIcon />
                  </div>
                  <span className={styles.stepNumber}>01</span>
                </div>
                <h3 className={styles.stepTitle}>Busca</h3>
                <p className={styles.stepDesc}>
                  Elige el oficio que necesitas y encuentra perfiles de confianza cerca de ti.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBox}>
                    <ClipboardIcon />
                  </div>
                  <span className={styles.stepNumber}>02</span>
                </div>
                <h3 className={styles.stepTitle}>Solicita</h3>
                <p className={styles.stepDesc}>
                  Envía tu solicitud a la persona que más te convenga.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBox}>
                    <CheckCircleIcon />
                  </div>
                  <span className={styles.stepNumber}>03</span>
                </div>
                <h3 className={styles.stepTitle}>Haz seguimiento</h3>
                <p className={styles.stepDesc}>
                  Revisa el estado de tus servicios desde tu cuenta, cuando quieras.
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.howItWorksGrid}>
              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBoxBlue}>
                    <WrenchIcon />
                  </div>
                  <span className={styles.stepNumberBlue}>01</span>
                </div>
                <h3 className={styles.stepTitle}>Crea tu perfil</h3>
                <p className={styles.stepDesc}>
                  Cuéntanos tu oficio, tu experiencia y en qué zona trabajas.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBoxBlue}>
                    <BellIcon />
                  </div>
                  <span className={styles.stepNumberBlue}>02</span>
                </div>
                <h3 className={styles.stepTitle}>Recibe solicitudes</h3>
                <p className={styles.stepDesc}>
                  Las personas cerca de ti te contactan cuando necesitan tu oficio.
                </p>
              </div>

              <div className={styles.stepCard}>
                <div className={styles.stepCardTop}>
                  <div className={styles.stepIconBoxBlue}>
                    <CheckCircleIcon color="#40657e" />
                  </div>
                  <span className={styles.stepNumberBlue}>03</span>
                </div>
                <h3 className={styles.stepTitle}>Realiza el trabajo</h3>
                <p className={styles.stepDesc}>
                  Acepta la solicitud, cumple el servicio y actualiza su estado.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 3. HOME SOLO TRABAJADOR (propuesta oficial Figma)
   * ───────────────────────────────────────────────────────────────── */
  if (isTrabajador) {
    return (
      <div className={styles.page}>
        {/* 1. Hero Banner */}
        <section className={styles.heroWorker}>
          <div className={styles.heroDecoCircle1} aria-hidden="true" />
          <div className={styles.heroDecoCircle2} aria-hidden="true" />

          <div className={styles.heroTopRow}>
            <span className={styles.eyebrowText}>INICIO</span>
            <span className={styles.rolePillWorker}>Trabajador</span>
          </div>

          <h1 className={styles.heroTitleWorker}>
            Hola, <span className={styles.heroNameHighlight}>{firstName || 'Usuario'}</span>
          </h1>

          <p className={styles.heroDescWorker}>
            Muestra tu oficio y recibe solicitudes de personas cerca de ti.
          </p>

          <div className={styles.heroWorkerActions}>
            <Link
              to={workerProfile?.id ? '/worker/profile' : '/worker/create'}
              className={styles.primaryPillBtn}
            >
              <span>Mi perfil de trabajo</span>
              <ArrowRightIcon />
            </Link>
            <button
              type="button"
              role="switch"
              aria-checked={isAvailableNow}
              disabled={workerProfile?.status === 'PAUSED'}
              onClick={handleToggleAvailability}
              className={styles.heroAvailablePill}
            >
              <span className={`${styles.toggleSwitch} ${isAvailableNow ? styles.toggleSwitchActive : ''}`}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.heroAvailableLabel}>Disponible ahora</span>
            </button>
          </div>
        </section>

        {/* 2. Métricas (Perfil + Solicitudes) */}
        <section className={styles.workerMetricsGrid}>
          {/* Card 1: Tu perfil de trabajo */}
          <div className={styles.workerMetricCard}>
            <div className={styles.workerMetricTop}>
              <div className={styles.workerMetricHeaderLeft}>
                <div className={styles.stepIconBoxBlue}>
                  <WrenchIcon />
                </div>
                <h3 className={styles.workerMetricTitle}>Tu perfil de trabajo</h3>
              </div>
              <span className={styles.workerMetricPercent}>{progressPercent}%</span>
            </div>

            <div className={styles.progressBarBg}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <p className={styles.workerMetricDesc}>
              Completa tu perfil para recibir más solicitudes.
            </p>

            <Link
              to={workerProfile?.id ? '/worker/profile' : '/worker/create'}
              className={styles.workerOutlineBtn}
            >
              <span>Completar perfil</span>
              <ArrowRightIcon />
            </Link>
          </div>

          {/* Notificaciones movidas a la campanita del navbar */}
        </section>

        {/* 3. ¿Qué quieres hacer hoy? */}
        <section className={styles.workerTodaySection}>
          <div className={styles.sectionHeaderCentered}>
            <h2 className={styles.sectionTitle}>¿Qué quieres hacer hoy?</h2>
            <p className={styles.sectionSubtitle}>Administra tu perfil y tu disponibilidad.</p>
          </div>

          <div className={styles.workerTodayGrid}>
            <div className={styles.workerActionCardBlue}>
              <div className={styles.stepIconBoxBlue}>
                <WrenchIcon />
              </div>
              <h3 className={styles.workerActionCardTitle}>Mi perfil de trabajo</h3>
              <p className={styles.workerActionCardDesc}>
                Así te ven quienes buscan tu oficio. Un perfil completo recibe más solicitudes.
              </p>
              <Link
                to={workerProfile?.id ? '/worker/profile' : '/worker/create'}
                className={styles.workerPrimaryBtn}
              >
                <span>Abrir mi perfil</span>
                <ArrowRightIcon />
              </Link>
            </div>

            <div className={styles.workerActionCardBlue}>
              <div className={styles.stepIconBoxBlue}>
                <ClockIcon />
              </div>
              <h3 className={styles.workerActionCardTitle}>Disponibilidad</h3>
              <p className={styles.workerActionCardDesc}>
                Dile a la gente cuándo puedes trabajar y mantén tus horarios de la semana al día.
              </p>
              <Link
                to={workerProfile?.id ? '/worker/availability' : '/worker/create'}
                className={styles.workerOutlineBtn}
              >
                <span>Editar horarios</span>
                <ArrowRightIcon />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Así funciona para trabajadores */}
        <section className={styles.howItWorksSection}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionTitle}>Así funciona para trabajadores</h2>
            <p className={styles.sectionSubtitle}>Recibir trabajo con OficioYa es simple.</p>
          </div>

          <div className={styles.howItWorksGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <div className={styles.stepIconBoxBlue}>
                  <WrenchIcon />
                </div>
                <span className={styles.stepNumberBlue}>01</span>
              </div>
              <h3 className={styles.stepTitle}>Crea tu perfil</h3>
              <p className={styles.stepDesc}>
                Cuéntanos tu oficio, tu experiencia y en qué zona trabajas.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <div className={styles.stepIconBoxBlue}>
                  <BellIcon />
                </div>
                <span className={styles.stepNumberBlue}>02</span>
              </div>
              <h3 className={styles.stepTitle}>Recibe solicitudes</h3>
              <p className={styles.stepDesc}>
                Las personas cerca de ti te contactan cuando necesitan tu oficio.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepCardTop}>
                <div className={styles.stepIconBoxBlue}>
                  <CheckCircleIcon color="#40657e" />
                </div>
                <span className={styles.stepNumberBlue}>03</span>
              </div>
              <h3 className={styles.stepTitle}>Realiza el trabajo</h3>
              <p className={styles.stepDesc}>
                Acepta la solicitud, cumple el servicio y actualiza su estado.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Consejos para recibir más solicitudes */}
        <section className={styles.tipsSection}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionTitle}>Consejos para recibir más solicitudes</h2>
            <p className={styles.sectionSubtitle}>Cada consejo que cumples sube el progreso de tu perfil.</p>
          </div>

          <div className={styles.tipsList}>
            {tips.map((tip) => (
              <Link
                key={tip.id}
                to={tip.link}
                className={`${styles.tipItem} ${tip.done ? styles.tipItemDone : styles.tipItemPending}`}
              >
                <div className={styles.tipLeft}>
                  {tip.done ? (
                    <div className={styles.tipIconDone}>
                      <CheckCircleIcon color="#1e824c" />
                    </div>
                  ) : (
                    <div className={styles.tipIconPending} />
                  )}
                  <span className={styles.tipTitle}>{tip.title}</span>
                </div>
                <span className={tip.done ? styles.tipBadgeDone : styles.tipBadgePending}>
                  {tip.done ? 'Listo' : 'Pendiente'}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 6. Una cuenta, dos roles */}
        <section className={styles.twoRolesWorkerCard}>
          <div className={styles.twoRolesWorkerLeft}>
            <div className={styles.twoRolesHeader}>
              <div className={styles.briefcaseIconBoxPeach}>
                <SearchIcon />
              </div>
              <h2 className={styles.twoRolesTitle}>Una cuenta, dos roles</h2>
            </div>

            <p className={styles.twoRolesDesc}>
              En OficioYa también puedes contratar servicios. Usa la misma cuenta, sin registrarte de nuevo.
            </p>

            <div className={styles.roleChipsRow}>
              <span className={styles.roleChipActive}>
                <CheckIcon />
                Trabajador
              </span>
              <span className={styles.roleChipProspective}>
                <span>+</span>
                Contratante
              </span>
            </div>

            <ul className={styles.benefitsList}>
              <li className={styles.benefitItem}>
                <CheckCircleIcon color="#d65b38" />
                <span>Busca personas de confianza cerca de ti</span>
              </li>
              <li className={styles.benefitItem}>
                <CheckCircleIcon color="#d65b38" />
                <span>Sigue el estado de tus solicitudes</span>
              </li>
              <li className={styles.benefitItem}>
                <CheckCircleIcon color="#d65b38" />
                <span>Cambia de rol cuando quieras</span>
              </li>
            </ul>
          </div>

          <div className={styles.twoRolesWorkerRight}>
            <button
              type="button"
              className={styles.addRoleBtnWhite}
              onClick={() => handleAddRole('CONTRATANTE')}
              disabled={addingRole}
            >
              <span>+</span>
              <span>{addingRole ? 'Agregando...' : 'Agregar rol de contratante'}</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────────────
   * 4. HOME SOLO CONTRATANTE (propuesta oficial Figma)
   * ───────────────────────────────────────────────────────────────── */
  function handleScrollToHowItWorks() {
    const el = document.getElementById('como-funciona');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className={styles.page}>
      {/* 1. Hero Banner */}
      <section className={styles.heroContratante}>
        <div className={styles.heroDecoCircle1} aria-hidden="true" />
        <div className={styles.heroDecoCircle2} aria-hidden="true" />

        <div className={styles.heroTopRow}>
          <span className={styles.eyebrowText}>INICIO</span>
          <span className={styles.rolePillContratante}>Contratante</span>
        </div>

        <h1 className={styles.heroTitleContratante}>
          Hola, <span className={styles.heroNameHighlight}>{firstName || 'Usuario'}</span>
        </h1>

        <p className={styles.heroDescContratante}>
          Encuentra personas de confianza para arreglar, instalar o construir lo que necesites, cerca de ti. Todo en un solo lugar.
        </p>

        <div className={styles.heroActions}>
          <Link to="/buscar" className={styles.primaryPillBtn}>
            <span>Buscar un oficio</span>
            <ArrowRightIcon />
          </Link>
          <button
            type="button"
            onClick={handleScrollToHowItWorks}
            className={styles.secondaryPillBtn}
          >
            Cómo funciona
          </button>
        </div>
      </section>

      {/* 2. Así funciona OficioYa */}
      <section id="como-funciona" className={styles.howItWorksSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Así funciona OficioYa</h2>
          <p className={styles.sectionSubtitle}>
            Contratar un servicio es fácil y todo queda en un solo lugar.
          </p>
        </div>

        <div className={styles.howItWorksGrid}>
          {/* Paso 01 */}
          <div className={styles.stepCard}>
            <div className={styles.stepCardTop}>
              <div className={styles.stepIconBox}>
                <SearchIcon />
              </div>
              <span className={styles.stepNumber}>01</span>
            </div>
            <h3 className={styles.stepTitle}>Busca</h3>
            <p className={styles.stepDesc}>
              Elige el oficio que necesitas y encuentra perfiles de confianza cerca de ti.
            </p>
          </div>

          {/* Paso 02 */}
          <div className={styles.stepCard}>
            <div className={styles.stepCardTop}>
              <div className={styles.stepIconBox}>
                <ClipboardIcon />
              </div>
              <span className={styles.stepNumber}>02</span>
            </div>
            <h3 className={styles.stepTitle}>Solicita</h3>
            <p className={styles.stepDesc}>
              Envía tu solicitud a la persona que más te convenga.
            </p>
          </div>

          {/* Paso 03 */}
          <div className={styles.stepCard}>
            <div className={styles.stepCardTop}>
              <div className={styles.stepIconBox}>
                <CheckCircleIcon />
              </div>
              <span className={styles.stepNumber}>03</span>
            </div>
            <h3 className={styles.stepTitle}>Haz seguimiento</h3>
            <p className={styles.stepDesc}>
              Revisa el estado de tus servicios desde tu cuenta, cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* 3. ¿Qué quieres hacer hoy? */}
      <section className={styles.todayCard}>
        <div className={styles.todayHeader}>
          <h2 className={styles.todayTitle}>¿Qué quieres hacer hoy?</h2>
          <p className={styles.todaySubtitle}>Elige una opción para empezar.</p>
        </div>

        <div className={styles.todayGrid}>
          {/* Opción 1: Buscar un oficio */}
          <div className={styles.todayActionCard}>
            <div className={styles.todayIconBox}>
              <SearchIcon />
            </div>
            <h3 className={styles.todayActionTitle}>Buscar un oficio</h3>
            <p className={styles.todayActionDesc}>
              Explora plomeros, electricistas, carpinteros y más. Encuentra a alguien de confianza cerca de ti.
            </p>
            <Link to="/buscar" className={styles.todayPrimaryBtn}>
              <span>Buscar ahora</span>
              <ArrowRightIcon />
            </Link>
          </div>

          {/* Opción 2: Mis servicios */}
          <div className={styles.todayActionCard}>
            <div className={styles.todayIconBox}>
              <ClipboardIcon />
            </div>
            <h3 className={styles.todayActionTitle}>Mis servicios</h3>
            <p className={styles.todayActionDesc}>
              Mira cómo van tus solicitudes, su estado y retoma lo que dejaste pendiente.
            </p>
            <Link to="/solicitudes" className={styles.todaySecondaryBtn}>
              <span>Ver mis servicios</span>
              <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Oficios populares */}
      <section className={styles.popularTradesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Oficios populares</h2>
          <p className={styles.sectionSubtitle}>Empieza por uno de los más buscados.</p>
        </div>

        <div className={styles.tradesChipsWrap}>
          {POPULAR_TRADES.map((trade) => (
            <Link
              key={trade}
              to={`/buscar?q=${encodeURIComponent(trade)}`}
              className={styles.tradeChip}
            >
              <span className={styles.tradeDot} aria-hidden="true" />
              <span>{trade}</span>
            </Link>
          ))}
          <Link to="/buscar" className={styles.tradeChipMore}>
            <span>Ver todos</span>
            <ArrowRightIcon />
          </Link>
        </div>
      </section>

      {/* 5. Una cuenta, dos roles */}
      <section className={styles.twoRolesCard}>
        <div className={styles.twoRolesLeft}>
          <div className={styles.twoRolesHeader}>
            <div className={styles.briefcaseIconBox}>
              <BriefcaseIcon />
            </div>
            <h2 className={styles.twoRolesTitle}>Una cuenta, dos roles</h2>
          </div>

          <p className={styles.twoRolesDesc}>
            En OficioYa puedes contratar y también ofrecer tu oficio. Usa la misma cuenta para ambas cosas, sin registrarte de nuevo.
          </p>

          <div className={styles.roleChipsRow}>
            <span className={styles.roleChipActive}>
              <CheckIcon />
              Contratante
            </span>
            {isTrabajador ? (
              <span className={styles.roleChipActive}>
                <CheckIcon />
                Trabajador
              </span>
            ) : (
              <span className={styles.roleChipProspective}>
                <span>+</span>
                Trabajador
              </span>
            )}
          </div>

          <ul className={styles.benefitsList}>
            <li className={styles.benefitItem}>
              <CheckCircleIcon />
              <span>Recibe solicitudes de personas cerca de ti</span>
            </li>
            <li className={styles.benefitItem}>
              <CheckCircleIcon />
              <span>Arma tu perfil de trabajo</span>
            </li>
            <li className={styles.benefitItem}>
              <CheckCircleIcon />
              <span>Cambia de rol cuando quieras</span>
            </li>
          </ul>
        </div>

        <div className={styles.twoRolesRight}>
          {isTrabajador ? (
            <Link to="/worker/dashboard" className={styles.addRoleBtn}>
              Ir a mi panel de trabajador
            </Link>
          ) : (
            <button
              type="button"
              className={styles.addRoleBtn}
              onClick={() => handleAddRole('TRABAJADOR')}
              disabled={addingRole}
            >
              <span>+</span>
              <span>{addingRole ? 'Agregando...' : 'Agregar rol de trabajador'}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

