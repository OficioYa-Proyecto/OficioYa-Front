import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../../core/lib/session';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(() => getSession());

  useEffect(() => {
    const handleSessionUpdate = () => {
      setSession(getSession());
    };

    const handleSessionExpired = () => {
      setSession(null);
      window.location.assign('/auth?expired=1');
    };

    window.addEventListener('oy-session-refreshed', handleSessionUpdate);
    window.addEventListener('oy-profile-updated', handleSessionUpdate);
    window.addEventListener('oy-session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('oy-session-refreshed', handleSessionUpdate);
      window.removeEventListener('oy-profile-updated', handleSessionUpdate);
      window.removeEventListener('oy-session-expired', handleSessionExpired);
    };
  }, []);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children ? children : <Outlet />;
}

