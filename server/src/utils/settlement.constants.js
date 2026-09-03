/**
 * Values shared by the Settlement model, its validators, and the service that
 * moves one between states.
 *
 * Kept out of the model for the same reason as `expense.constants.js`: the
 * transition rules below are ordinary data, and nothing that reads them should
 * have to import Mongoose to do it.
 */

/**
 * Spec §12 asks for three: pending, paid, confirmed. `cancelled` is a fourth,
 * added because without it a settlement recorded by mistake sits on the Settle
 * Up page for ever — un-confirmable, un-removable, and permanently suggesting
 * a payment nobody intends to make. It is a withdrawal, not a deletion: the row
 * stays, with who cancelled it and when.
 */
export const SETTLEMENT_STATUSES = ['pending', 'paid', 'confirmed', 'cancelled'];

/** Only confirmed settlements move a balance. */
export const CONFIRMED = 'confirmed';

/**
 * Who may move a settlement into each state, and from where.
 *
 * `actor` names the side of the transaction — not a role in the room. A room
 * admin has no special power over somebody else's payment: whether the money
 * arrived is a fact only the person receiving it can attest to.
 */
export const TRANSITIONS = {
  // "I have sent the money." Only the payer can say that.
  paid: { from: ['pending'], actor: 'payer' },

  // "It arrived." Only the receiver can say that — and they can say it whether
  // or not the payer got round to marking it sent.
  confirmed: { from: ['pending', 'paid'], actor: 'receiver' },

  // Either side may withdraw an unconfirmed settlement.
  cancelled: { from: ['pending', 'paid'], actor: 'either' },
};
