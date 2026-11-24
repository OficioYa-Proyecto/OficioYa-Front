import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Skeleton from './Skeleton';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { NOMBRES_ROL } from '../config';
import { getProfilePhotoUrl } from '../../core/lib/imageService';
import { getSession } from '../../core/lib/session';
import Icon from './Icon';
import styles from './UserTable.module.css';
import vista from './ProfileView.module.css';

const FILTROS = [
    { id: 'ACTIVE', label: 'Activas' },
    { id: 'INACTIVE', label: 'Inactivas' },
];

const FILTROS_ROL = [
    { id: 'CONTRATANTE', label: 'Contratantes' },
    { id: 'TRABAJADOR', label: 'Trabajadores' },
    { id: 'ADMIN', label: 'Administradores' },
];

const POR_PAGINA = 10;
// Cuántos números de página se muestran a la vez (ej: 9 10 11 12 13)
const PAGINAS_VISIBLES = 5;

// Fotos ya cargadas, para no volver a pedirlas al regresar a una página
const fotosCargadas = new Map();

// Si se elimina o cambia una foto (detalle del admin o edición del perfil), se vuelven a pedir
window.addEventListener('oy-profile-updated', () => fotosCargadas.clear());

function UserTable() {
    const { users, loading, error } = useAdminUsers();
    const [busqueda, setBusqueda] = useState('');
    // null = sin filtro; al volver a tocar el filtro elegido se quita
    const [filtro, setFiltro] = useState(null);
    const [filtroRol, setFiltroRol] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [paginaEscrita, setPaginaEscrita] = useState('');
    const filtrosActivos = (filtro ? 1 : 0) + (filtroRol ? 1 : 0);
    const [pagina, setPagina] = useState(1);

    const activas = users.filter((u) => u.accountStatus === 'ACTIVE').length;
    const inactivas = users.length - activas;
    const texto = busqueda.trim().toLowerCase();
    const visibles = users.filter((u) =>
        (!filtro || u.accountStatus === filtro)
        && (!filtroRol || u.roles.includes(filtroRol))
        && (texto === '' || u.name.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto)));
    const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
    const actual = Math.min(pagina, totalPaginas);
    const inicio = (actual - 1) * POR_PAGINA;
    const enPagina = visibles.slice(inicio, inicio + POR_PAGINA);
    // Ventana de páginas centrada en la actual, sin pasarse del inicio ni del final
    const primeraVisible = Math.max(1, Math.min(actual - Math.floor(PAGINAS_VISIBLES / 2), totalPaginas - PAGINAS_VISIBLES + 1));
    const ultimaVisible = Math.min(totalPaginas, primeraVisible + PAGINAS_VISIBLES - 1);
    const paginasVisibles = Array.from({ length: ultimaVisible - primeraVisible + 1 }, (_, i) => primeraVisible + i);

    // Va a la página escrita (si se pasa del rango, a la primera o a la última)
    function irAPagina() {
        const numero = Number(paginaEscrita);
        if (paginaEscrita !== '' && Number.isInteger(numero)) {
            setPagina(Math.min(Math.max(numero, 1), totalPaginas));
        }
        setPaginaEscrita('');
    }

    return (
        <section className={vista.page}>
            <div className={styles.intro}>
                <span className="eyebrow">Panel de administración</span>
                <h1 className={vista.name}>
                    Gestión de <span className={vista.accent}>usuarios</span>
                </h1>
                <p>Consulta las cuentas y activa o desactiva las que lo necesiten.</p>
            </div>

            {!loading && !error && (
                <div className={styles.summary}>
                    <Resumen
                        icono="user"
                        titulo="Cuentas registradas"
                        valor={users.length}
                        descripcion="Total de cuentas en OficioYa"
                    />
                    <Resumen
                        icono="shield"
                        titulo="Cuentas activas"
                        valor={activas}
                        descripcion={`${porcentaje(activas, users.length)} del total pueden usar la plataforma`}
                        parte={activas}
                        total={users.length}
                        tipo="activa"
                    />
                    <Resumen
                        icono="lock"
                        titulo="Cuentas inactivas"
                        valor={inactivas}
                        descripcion={`${porcentaje(inactivas, users.length)} del total están desactivadas`}
                        parte={inactivas}
                        total={users.length}
                        tipo="inactiva"
                    />
                </div>
            )}

            <div className="card">
                <div className={styles.toolbar}>
                    <input
                        type="search"
                        aria-label="Buscar usuario"
                        placeholder="Buscar por nombre o correo"
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPagina(1);
                        }}
                    />
                    <button
                        type="button"
                        className={filtrosActivos > 0 ? styles.filterActive : styles.filter}
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                        aria-expanded={mostrarFiltros}
                    >
                        {filtrosActivos > 0 ? `Filtrar (${filtrosActivos})` : 'Filtrar'}
                    </button>
                </div>

                {/* Filtros ocultos hasta presionar "Filtrar" */}
                {mostrarFiltros && (
                    <div className={styles.filterPanel}>
                        <div className={styles.filterRow} role="group" aria-label="Filtrar por estado">
                            <span>Estado</span>
                            {FILTROS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={filtro === f.id ? styles.filterActive : styles.filter}
                                    onClick={() => {
                                        setFiltro(filtro === f.id ? null : f.id);
                                        setPagina(1);
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className={styles.filterRow} role="group" aria-label="Filtrar por rol">
                            <span>Rol</span>
                            {FILTROS_ROL.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={filtroRol === f.id ? styles.filterActive : styles.filter}
                                    onClick={() => {
                                        setFiltroRol(filtroRol === f.id ? null : f.id);
                                        setPagina(1);
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        {filtrosActivos > 0 && (
                            <button
                                type="button"
                                className={styles.clearFilters}
                                onClick={() => {
                                    setFiltro(null);
                                    setFiltroRol(null);
                                    setPagina(1);
                                }}
                            >
                                Quitar filtros
                            </button>
                        )}
                    </div>
                )}

                {(loading || error) && <Skeleton lines={5} error={error} />}
                {!loading && !error && visibles.length === 0 && (
                    <p>{users.length === 0 ? 'No hay usuarios registrados.' : 'Ninguna cuenta coincide con la búsqueda.'}</p>
                )}

                {visibles.length > 0 && (
                    <table className={styles.table}>
                        <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Correo</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                        </thead>
                        <tbody>
                        {enPagina.map((user) => (
                            <tr key={user.id}>
                                <td>
                                    <div className={styles.usuario}>
                                        <Avatar key={`${user.id}-${actual}`} userId={user.id} nombre={user.name} />
                                        <div>
                                            <strong>{user.name}</strong>
                                            <small className={styles.roles}>{user.roles.map((r) => NOMBRES_ROL[r] ?? r).join(' · ')}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>{enmascararCorreo(user.email)}</td>
                                <td>
                    <span className={user.accountStatus === 'ACTIVE' ? styles.pillActive : styles.pillInactive}>
                      {user.accountStatus === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </span>
                                </td>
                                <td>
                                    <Link to={`/admin/users/${user.id}`} className={`${styles.filter} ${styles.link}`}>Revisar</Link>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                {visibles.length > POR_PAGINA && (
                    <div className={styles.pagination}>
                        <small>
                            Mostrando {enPagina.length} de {visibles.length} - Página {actual} de {totalPaginas}
                        </small>
                        <div className={styles.filters}>
                            <button
                                type="button"
                                className={styles.filter}
                                onClick={() => setPagina(1)}
                                disabled={actual === 1}
                            >
                                Primera
                            </button>
                            <button
                                type="button"
                                className={styles.filter}
                                onClick={() => setPagina(actual - 1)}
                                disabled={actual === 1}
                            >
                                Anterior
                            </button>
                            {paginasVisibles.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    className={n === actual ? styles.filterActive : styles.filter}
                                    onClick={() => setPagina(n)}
                                    aria-current={n === actual ? 'page' : undefined}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                className={styles.filter}
                                onClick={() => setPagina(actual + 1)}
                                disabled={actual === totalPaginas}
                            >
                                Siguiente
                            </button>
                            <button
                                type="button"
                                className={styles.filter}
                                onClick={() => setPagina(totalPaginas)}
                                disabled={actual === totalPaginas}
                            >
                                Última
                            </button>
                            <label className={styles.pageJump}>
                                Ir a la página
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPaginas}
                                    placeholder={String(actual)}
                                    value={paginaEscrita}
                                    onChange={(e) => setPaginaEscrita(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && irAPagina()}
                                    onBlur={irAPagina}
                                />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

// Foto de perfil del usuario (o sus iniciales si no tiene), igual que en ProfileHeader
function Avatar({ userId, nombre }) {
    const [foto, setFoto] = useState(fotosCargadas.get(userId) ?? null);
    const partes = (nombre || 'Usuario').trim().split(/\s+/);
    const iniciales = (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] ?? '')).toUpperCase();

    useEffect(() => {
        if (fotosCargadas.has(userId)) return;
        let activo = true;
        getProfilePhotoUrl(userId, getSession()?.token).then((url) => {
            if (url) fotosCargadas.set(userId, url);
            if (activo) setFoto(url);
        });
        return () => {
            activo = false;
        };
    }, [userId]);

    function fallo() {
        fotosCargadas.delete(userId);
        setFoto(null);
    }

    return (
        <span className={styles.avatar}>
            {foto ? <img src={foto} alt="" onError={fallo} /> : iniciales}
        </span>
    );
}

// Tarjeta del resumen: ícono, título, número y una barra con la proporción sobre el total
function Resumen({ icono, titulo, valor, descripcion, parte, total, tipo }) {
    const estilo = tipo === 'activa' ? styles.summaryActive : tipo === 'inactiva' ? styles.summaryInactive : '';
    const ancho = total ? Math.round((parte * 100) / total) : 0;
    return (
        <div className={`card ${styles.summaryCard} ${estilo}`}>
            <div className={styles.summaryTop}>
                <span className={styles.summaryIcon}><Icon name={icono} size={18} /></span>
                <small>{titulo}</small>
            </div>
            <strong>{valor}</strong>
            {tipo && (
                <div className={styles.summaryBar} aria-hidden="true">
                    <span style={{ width: `${ancho}%` }} />
                </div>
            )}
            <span className={styles.summaryText}>{descripcion}</span>
        </div>
    );
}

function porcentaje(parte, total) {
    return total === 0 ? '0 %' : `${Math.round((parte * 100) / total)} %`;
}

// Mismo formato que el back: primera y última letra antes de la @ (carlos@gmail.com -> c**s@gmail.com)
function enmascararCorreo(correo) {
    if (!correo) return '';
    const idx = correo.indexOf('@');
    if (idx <= 0) return correo;
    const usuario = correo.slice(0, idx);
    const ultima = usuario.length > 1 ? usuario.slice(-1) : '';
    return usuario[0] + '**' + ultima + correo.slice(idx);
}

export default UserTable;