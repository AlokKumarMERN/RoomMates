import { createContext } from 'react';

/**
 * Kept in its own file so that AuthProvider.jsx exports only a component.
 * Mixing component and non-component exports in one module breaks Vite's fast
 * refresh, which silently stops hot reload from working during development.
 */
export const AuthContext = createContext(null);
