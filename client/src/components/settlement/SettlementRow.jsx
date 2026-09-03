import Button from '../ui/Button.jsx';
import { formatINR } from '../../utils/money.js';

/**
 * One recorded payment, with whichever action is this person's to take.
 *
 * The buttons follow the lifecycle rules the API enforces: the payer says it
 * was sent, the person receiving it says it arrived, and either may withdraw it
 * before that. Showing a button the server would refuse is worse than showing
 * none, so each is gated on the same condition the service checks.
 */

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  paid: 'bg-brand-50 text-brand-700',
  confirmed: 'bg-positive-50 text-positive-700',
  cancelled: 'bg-slate-100 text-slate-400',
};

const STATUS_LABELS = {
  pending: 'Pending',
  paid: 'Marked sent',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const timestamp = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** The one line that says where this settlement currently stands. */
function statusLine(settlement, { isPayer, isReceiver }) {
  const payer = isPayer ? 'You' : settlement.payer?.name?.split(' ')[0];
  const receiver = isReceiver ? 'you' : settlement.receiver?.name?.split(' ')[0];

  if (settlement.status === 'confirmed') {
    return `${receiver === 'you' ? 'You' : receiver} confirmed this on ${timestamp(settlement.confirmedAt)}`;
  }

  if (settlement.status === 'cancelled') {
    const by = settlement.cancelledBy?.name?.split(' ')[0] ?? 'Someone';
    return `Cancelled by ${by} on ${timestamp(settlement.cancelledAt)}`;
  }

  if (settlement.status === 'paid') {
    return `${payer} marked this sent on ${timestamp(settlement.paidAt)} — waiting for ${receiver} to confirm`;
  }

  return `Recorded on ${timestamp(settlement.createdAt)}`;
}

export default function SettlementRow({ settlement, currentUserId, onUpdate, busyId }) {
  const isPayer = settlement.payer?.id === currentUserId;
  const isReceiver = settlement.receiver?.id === currentUserId;
  const isBusy = busyId === settlement.id;

  const isOpen = settlement.status === 'pending' || settlement.status === 'paid';

  const canMarkSent = isPayer && settlement.status === 'pending';
  const canConfirm = isReceiver && isOpen;
  const canCancel = (isPayer || isReceiver) && isOpen;

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-900">
            <span className="font-medium">{isPayer ? 'You' : settlement.payer?.name}</span>
            <span className="mx-1.5 text-slate-400" aria-label="pays">
              →
            </span>
            <span className="font-medium">
              {isReceiver ? 'you' : settlement.receiver?.name}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {statusLine(settlement, { isPayer, isReceiver })}
          </p>
          {settlement.note && (
            <p className="mt-1 text-xs text-slate-500">“{settlement.note}”</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`tabular text-sm font-semibold ${
              settlement.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {formatINR(settlement.amount)}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase ${
              STATUS_STYLES[settlement.status]
            }`}
          >
            {STATUS_LABELS[settlement.status]}
          </span>
        </div>
      </div>

      {(canMarkSent || canConfirm || canCancel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canConfirm && (
            <Button size="sm" isLoading={isBusy} onClick={() => onUpdate(settlement, 'confirmed')}>
              Confirm received
            </Button>
          )}
          {canMarkSent && (
            <Button
              size="sm"
              variant="secondary"
              isLoading={isBusy}
              onClick={() => onUpdate(settlement, 'paid')}
            >
              I&apos;ve sent it
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              isLoading={isBusy}
              onClick={() => onUpdate(settlement, 'cancelled')}
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* The payer's side of a marked-sent settlement: nothing to do but wait. */}
      {isPayer && settlement.status === 'paid' && (
        <p className="mt-2 text-xs text-slate-500">
          Waiting for {settlement.receiver?.name?.split(' ')[0]} to confirm. Only they can — which
          is what stops a debt being cleared by saying it was paid.
        </p>
      )}
    </li>
  );
}
