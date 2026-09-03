import { useCallback, useEffect, useMemo, useState } from 'react';

import * as authApi from '../services/auth.service.js';
import { TOKEN_STORAGE_KEY } from '../services/api.js';
import { AuthContext } from './auth-context.js';

/**
 * Holds the signed-in user for the whole app.
 *
 * The token lives in localStorage; the user object is re-fetched from the API on
 * mount rather than cached alongside it. That way a name change or a deleted
 * account is reflected on the next page load, and there is no stale copy of the
 * user to keep in sync.
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Starts true so ProtectedRoute waits for the session check instead of
  // redirecting to /login for a moment on every refresh.
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      setIsRestoring(false);
      return;
    }

    authApi
      .getMe()
      .then((data) => setUser(data.user))
      .catch(() => {
        // Expired or revoked — the interceptor has already cleared the token.
        setUser(null);
      })
      .finally(() => setIsRestoring(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await authApi.register(details);
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isRestoring, login, register, logout }),
    [user, isRestoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
