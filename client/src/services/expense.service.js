import { request } from './api.js';

/**
 * Amounts crossing this boundary are always integer paise. The pages convert
 * at the input and the display, never here.
 */

export function createExpense(roomId, payload) {
  return request({ url: `/rooms/${roomId}/expenses`, method: 'POST', data: payload });
}

/**
 * One page of a room's expenses.
 *
 * Uses `request.raw` because the caller needs `meta` (page, total, hasNextPage)
 * as well as the rows — pagination cannot be driven from the rows alone.
 *
 * @returns {Promise<{expenses: object[], meta: object}>}
 */
export async function listExpenses(roomId, params = {}) {
  // Drop empty filters so the URL stays clean and the server never has to
  // decide what an empty string means.
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );

  const body = await request.raw({ url: `/rooms/${roomId}/expenses`, method: 'GET', params: query });

  return { expenses: body.data.expenses, meta: body.meta };
}

export function getExpense(expenseId) {
  return request({ url: `/expenses/${expenseId}`, method: 'GET' });
}
