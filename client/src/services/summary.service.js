import { request } from './api.js';

/**
 * The dashboard's single request: totals, the member comparison table, the
 * chart series, suggested settlements, and the caller's own position.
 *
 * One call rather than five, because these figures have to agree with each
 * other. Fetching them separately would let the summary cards and the member
 * table describe two different moments if an expense landed in between.
 *
 * Every amount is integer paise, as everywhere else on this boundary.
 *
 * @param {string} roomId
 * @param {{from?: string, to?: string}} [params] Optional reporting window.
 */
export function getRoomSummary(roomId, params = {}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );

  return request({ url: `/rooms/${roomId}/summary`, method: 'GET', params: query });
}
