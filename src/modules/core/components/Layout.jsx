import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import styles from './Layout.module.css';
import { useInactivityTimeout } from '../../auth/hooks/useInactivityTimeout';

function Layout() {
    const { pathname } = useLocation();
    const isAuth = pathname.startsWith('/auth');

    // Manejo de expiración por inactividad y renovación deslizante
    useInactivityTimeout();

    return (
        <div className={styles.shell}>
            <Navbar />
            <main className={isAuth ? styles.auth : styles.main}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default Layout;