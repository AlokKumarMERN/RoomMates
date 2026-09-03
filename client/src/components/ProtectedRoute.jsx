import { Navigate, Outlet, useLocation } from 'react-router-dom';

import useAuth from '../hooks/useAuth.js';
import Spinner from './ui/Spinner.jsx';

/**
 * Gate for authenticated routes.
 *
 * Note this is a convenience, not a security boundary — anyone can edit the
 * bundle. Every protected endpoint checks authorization on the server too
 * (spec §31); this only keeps honest users out of pages that would fail anyway.
 */
export default function ProtectedRoute() {
  const { isAuthenticated, isRestoring } = useAuth();
  const location = useLocation();

  // Wait for the session check. Redirecting first would bounce a signed-in user
  // to /login for a frame on every refresh.
  if (isRestoring) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8 text-brand-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Remember where they were headed so sign-in can return them there.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
