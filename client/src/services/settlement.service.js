import { request } from './api.js';

/**
 * Settlements — payments between two people that clear what is outstanding.
 *
 * They never touch an expense (spec §12). Recording that you handed Rohit ₹300
 * does not change what last month's shopping cost; it changes what is
 * outstanding between you.
 *
 * Amounts are integer paise here as everywhere on this boundary.
 */

/**
 * Record a payment. It starts as `pending` — nothing moves until the person
 * receiving it confirms the money arrived.
 *
 * You have to be one of the two people involved; the API refuses a payment
 * recorded between two others.
 */
export function createSettlement(roomId, { payer, receiver, amount, note }) {
  return request({
    url: `/rooms/${roomId}/settlements`,
    method: 'POST',
    data: { payer, receiver, amount, note: note || undefined },
  });
}

/**
 * A room's settlements, newest first — including cancelled ones (§12 history).
 *
 * Uses `request.raw` because the caller needs `meta` as well as the rows;
 * pagination cannot be driven from the rows alone.
 *
 * @returns {Promise<{settlements: object[], meta: object}>}
 */
export async function listSettlements(roomId, params = {}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );

  const body = await request.raw({
    url: `/rooms/${roomId}/settlements`,
    method: 'GET',
    params: query,
  });

  return { settlements: body.data.settlements, meta: body.meta };
}

/**
 * Move a settlement along: `paid` (the payer, "I sent it"), `confirmed` (the
 * receiver, "it arrived"), or `cancelled` (either, before confirmation).
 *
 * The API enforces who may do which. `confirmed` is terminal — a mistake is
 * corrected by recording a payment the other way, not by rewriting this one.
 */
export function updateSettlement(settlementId, status) {
  return request({ url: `/settlements/${settlementId}`, method: 'PATCH', data: { status } });
}
