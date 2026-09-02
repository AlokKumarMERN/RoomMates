import { request } from './api.js';

export function getHealth() {
  return request({ url: '/health', method: 'GET' });
}

/** Hits the deliberate-failure route, to confirm error handling end to end. */
export function triggerTestError() {
  return request({ url: '/health/boom', method: 'GET' });
}
