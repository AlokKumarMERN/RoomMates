import { request } from './api.js';

export function register({ name, email, password }) {
  return request({ url: '/auth/register', method: 'POST', data: { name, email, password } });
}

export function login({ email, password }) {
  return request({ url: '/auth/login', method: 'POST', data: { email, password } });
}

/** Restores the session on page reload, using the stored token. */
export function getMe() {
  return request({ url: '/auth/me', method: 'GET' });
}
