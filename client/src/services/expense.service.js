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

/**
 * Edit an expense. Only the creator may — the API enforces it, and returns 403
 * with `NOT_EXPENSE_CREATOR` for anyone else.
 *
 * The four money fields travel together or not at all: send all of `amount`,
 * `splitType`, `participants` and `paidBy`, or none of them. A new total with
 * the old split leaves shares that no longer add up, and the server will not
 * guess whose share absorbs the difference.
 */
export function updateExpense(expenseId, payload) {
  return request({ url: `/expenses/${expenseId}`, method: 'PATCH', data: payload });
}

/**
 * Remove an expense — a soft delete, so this returns the expense rather than
 * nothing. It stays readable, marked as removed, and stops counting towards
 * any total. The creator or a room admin may do it.
 */
export function deleteExpense(expenseId) {
  return request({ url: `/expenses/${expenseId}`, method: 'DELETE' });
}

/** Every edit ever made to this expense, newest first. */
export function getExpenseHistory(expenseId) {
  return request({ url: `/expenses/${expenseId}/history`, method: 'GET' });
}
