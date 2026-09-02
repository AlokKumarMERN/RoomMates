import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'roommates.token';

/**
 * The single axios instance every service module uses. Centralising it means
 * auth headers and error shaping are handled in one place instead of being
 * repeated in every component (spec §41).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/** Attach the JWT to every outgoing request, once Phase 2 starts issuing them. */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Normalise every failure into one predictable object.
 *
 * Without this, components have to reach into `error.response.data.error.message`
 * and guard against a network failure where `response` is undefined. With it,
 * every catch block can just read `error.message` (spec §25).
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalised = new Error();
    normalised.name = 'ApiRequestError';

    if (error.response) {
      const payload = error.response.data?.error;
      normalised.status = error.response.status;
      normalised.code = payload?.code ?? 'ERROR';
      normalised.message = payload?.message ?? 'Something went wrong. Please try again.';
      normalised.details = payload?.details;

      // The session is gone — drop the stale token. Phase 2 adds the redirect.
      if (error.response.status === 401) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } else if (error.code === 'ECONNABORTED') {
      normalised.status = 0;
      normalised.code = 'TIMEOUT';
      normalised.message = 'The server took too long to respond. Please try again.';
    } else {
      normalised.status = 0;
      normalised.code = 'NETWORK_ERROR';
      normalised.message = 'Something went wrong. Please check your connection.';
    }

    return Promise.reject(normalised);
  },
);

/**
 * Unwrap the `{ success, data, meta }` envelope so callers get the payload
 * directly. Use `request.raw` when you also need `meta` (pagination).
 */
export async function request(config) {
  const response = await api.request(config);
  return response.data?.data;
}

request.raw = async function requestRaw(config) {
  const response = await api.request(config);
  return response.data;
};

export default api;
