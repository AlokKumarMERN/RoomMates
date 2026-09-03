import { request } from './api.js';

/** Service/database status. Useful for debugging a connection problem. */
export function getHealth() {
  return request({ url: '/health', method: 'GET' });
}
