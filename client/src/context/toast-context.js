import { createContext } from 'react';

/**
 * Separate from the provider file so a fast-refresh edit to the provider does
 * not invalidate every consumer — the same split as auth-context and
 * room-context.
 */
export const ToastContext = createContext(null);
