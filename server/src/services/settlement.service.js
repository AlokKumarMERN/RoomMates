import Room from '../models/Room.js';
import Settlement from '../models/Settlement.js';
import ApiError from '../utils/ApiError.js';
import { formatINR } from '../utils/money.js';
import { TRANSITIONS } from '../utils/settlement.constants.js';
import { notifyUser, safely } from './notification.service.js';

const USER_FIELDS = 'name email avatar';

const POPULATE = [
  { path: 'payer', select: USER_FIELDS },
  { path: 'receiver', select: USER_FIELDS },
  { path: 'createdBy', select: USER_FIELDS },
  { path: 'cancelledBy', select: USER_FIELDS },
];

const idOf = (value) => String(value?._id ?? value);

/**
 * Everyone a settlement may involve: every member the room has ever had.
 *
 * Deliberately not just the active ones. Someone who moved out owing ₹300 still
 * owes ₹300 — refusing to record them paying it would leave that debt on the
 * books for ever, which is the opposite of what a Settle Up page is for.
 */
function everyMemberId(room) {
  return new Set(room.members.map((member) => idOf(member.user)));
}

/**
 * Record a payment between two people in a room.
 *
 * Either side may open it: the payer saying "I will send this", or the receiver
 * saying "you still owe me this". What neither can do is decide on their own
 * that it happened — that takes the receiver confirming, in `updateStatus`.
 */
export async function createSettlement({ room, userId, input }) {
  if (room.isArchived) {
    throw ApiError.badRequest(
      'This room is archived, so no new settlements can be recorded.',
      'ROOM_ARCHIVED',
    );
  }

  const payer = String(input.payer);
  const receiver = String(input.receiver);

  if (payer === receiver) {
    throw ApiError.validation('A settlement needs two different people.', [
      { field: 'receiver', message: 'Choose someone other than the payer.' },
    ]);
  }

  const members = everyMemberId(room);

  for (const [field, value] of [
    ['payer', payer],
    ['receiver', receiver],
  ]) {
    if (!members.has(value)) {
      throw ApiError.validation('A settlement can only be between people in this room.', [
        { field, message: 'That person is not in this room.' },
      ]);
    }
  }

  // The caller has to be one of the two. Recording a payment between two other
  // people is not something anybody should be able to do on their behalf —
  // neither of them has agreed to it, and it would move their balances the
  // moment the receiver confirmed something they never opened.
  const caller = String(userId);

  if (caller !== payer && caller !== receiver) {
    throw ApiError.forbidden(
      'You can only record a settlement you are part of.',
      'NOT_SETTLEMENT_PARTY',
    );
  }

  const settlement = await Settlement.create({
    room: room._id,
    payer,
    receiver,
    amount: input.amount,
    note: input.note,
    createdBy: userId,
    status: 'pending',
  });

  await settlement.populate(POPULATE);

  // Only the other party is told. A settlement is between two people, and
  // telling the rest of the room about money that is not theirs is noise.
  await safely(() =>
    notifyUser({
      userId: caller === payer ? receiver : payer,
      room,
      actorId: userId,
      type: 'settlement_recorded',
      entity: { type: 'settlement', id: settlement._id },
      message:
        caller === payer
          ? `${firstName(settlement.payer)} recorded a payment of ${formatINR(settlement.amount)} to you. Confirm it when the money arrives.`
          : `${firstName(settlement.receiver)} recorded a payment of ${formatINR(settlement.amount)} from you.`,
    }),
  );

  return settlement;
}

/** First name, or a neutral fallback if the ref is not populated. */
function firstName(user) {
  return user?.name?.split(' ')[0] ?? 'Someone';
}

/**
 * Move a settlement to its next state.
 *
 * The rules live in `settlement.constants.js`, and the check below is the only
 * thing enforcing them. A room admin gets no special power here: whether the
 * money arrived is a fact only the person receiving it can attest to.
 */
export async function updateStatus({ settlementId, userId, status }) {
  const settlement = await Settlement.findById(settlementId).populate(POPULATE);

  if (!settlement) {
    throw ApiError.notFound('Settlement not found.', 'SETTLEMENT_NOT_FOUND');
  }

  const room = await Room.findById(settlement.room);

  // Same rule as everywhere else: someone outside the room gets "not found",
  // so ids cannot be probed for existence.
  if (!room || !room.isMember(userId)) {
    throw ApiError.notFound('Settlement not found.', 'SETTLEMENT_NOT_FOUND');
  }

  const transition = TRANSITIONS[status];

  if (!transition) {
    throw ApiError.validation('That is not a state a settlement can be moved to.', [
      { field: 'status', message: 'Choose paid, confirmed or cancelled.' },
    ]);
  }

  if (settlement.status === status) return settlement;

  if (!transition.from.includes(settlement.status)) {
    // Confirmed is terminal, so this is the message that matters most.
    throw ApiError.badRequest(
      settlement.status === 'confirmed'
        ? 'This settlement is already confirmed. To correct it, record a payment the other way.'
        : `A ${settlement.status} settlement cannot be marked ${status}.`,
      'INVALID_SETTLEMENT_TRANSITION',
    );
  }

  const caller = String(userId);
  const isPayer = caller === idOf(settlement.payer);
  const isReceiver = caller === idOf(settlement.receiver);

  const allowed =
    transition.actor === 'either'
      ? isPayer || isReceiver
      : transition.actor === 'payer'
        ? isPayer
        : isReceiver;

  if (!allowed) {
    throw ApiError.forbidden(
      transition.actor === 'payer'
        ? 'Only the person paying can mark this as sent.'
        : transition.actor === 'receiver'
          ? 'Only the person receiving the money can confirm it arrived.'
          : 'You can only change a settlement you are part of.',
      'NOT_SETTLEMENT_ACTOR',
    );
  }

  settlement.status = status;

  if (status === 'paid') settlement.paidAt = new Date();
  if (status === 'confirmed') {
    settlement.confirmedAt = new Date();
    // A receiver may confirm a settlement the payer never marked sent. Stamping
    // `paidAt` too keeps the record coherent: money cannot arrive before it
    // left, and a blank "sent" date beside a filled "received" one reads as a
    // bug rather than a shortcut.
    if (!settlement.paidAt) settlement.paidAt = settlement.confirmedAt;
  }
  if (status === 'cancelled') {
    settlement.cancelledAt = new Date();
    settlement.cancelledBy = userId;
  }

  await settlement.save();
  await settlement.populate(POPULATE);

  const other = isPayer ? settlement.receiver : settlement.payer;
  const amount = formatINR(settlement.amount);

  const MESSAGES = {
    paid: `${firstName(settlement.payer)} marked a payment of ${amount} to you as sent. Confirm it when it arrives.`,
    confirmed: `${firstName(settlement.receiver)} confirmed your payment of ${amount}. You are square.`,
    cancelled: `${firstName(isPayer ? settlement.payer : settlement.receiver)} cancelled a settlement of ${amount}.`,
  };

  await safely(() =>
    notifyUser({
      userId: other,
      room,
      actorId: userId,
      type: `settlement_${status}`,
      entity: { type: 'settlement', id: settlement._id },
      message: MESSAGES[status],
    }),
  );

  return settlement;
}

/**
 * A room's settlements, newest first.
 *
 * Everything, including cancelled ones — spec §12 asks for settlement history,
 * and a withdrawn payment is part of the story of a shared ledger.
 */
export async function listSettlements({ roomId, query = {} }) {
  const filter = { room: roomId };
  if (query.status) filter.status = query.status;

  const { page = 1, limit = 20 } = query;

  const [settlements, total] = await Promise.all([
    Settlement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Settlement.countDocuments(filter),
  ]);

  return { settlements, total, page, limit };
}

/**
 * The confirmed settlements the balance engine folds into the ledger.
 *
 * Lean and narrow: the engine wants three fields, and this runs on every
 * dashboard load.
 */
export async function confirmedTransfers(roomId) {
  const settlements = await Settlement.find({ room: roomId, status: 'confirmed' })
    .select('payer receiver amount')
    .lean();

  return settlements.map((settlement) => ({
    from: settlement.payer,
    to: settlement.receiver,
    amount: settlement.amount,
  }));
}
