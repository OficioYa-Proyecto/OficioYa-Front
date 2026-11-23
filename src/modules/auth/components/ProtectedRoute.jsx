import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../../core/lib/session';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(() => getSession());

  useEffect(() => {
    const handleSessionUpdate = () => {
      setSession(getSession());
    };

    window.addEventListener('oy-session-refreshed', handleSessionUpdate);
    window.addEventListener('oy-profile-updated', handleSessionUpdate);

    return () => {
      window.removeEventListener('oy-session-refreshed', handleSessionUpdate);
      window.removeEventListener('oy-profile-updated', handleSessionUpdate);
    };
  }, []);

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return children ? children : <Outlet />;
}

