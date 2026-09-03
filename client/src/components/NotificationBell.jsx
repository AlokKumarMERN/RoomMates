import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Spinner from './ui/Spinner.jsx';
import useNotifications from '../hooks/useNotifications.js';

/**
 * The bell (plan §10): an unread count, and the list behind it.
 *
 * The list is fetched when the menu opens, not on every poll. Most of the time
 * nobody opens it, and the count alone answers the only question the header is
 * asking.
 */

const ICONS = {
  expense_added: '🧾',
  expense_edited: '✏️',
  expense_removed: '🗑️',
  member_joined: '👋',
  member_left: '👋',
  settlement_recorded: '💸',
  settlement_paid: '💸',
  settlement_confirmed: '✅',
  settlement_cancelled: '↩️',
};

/** Where clicking one should go. The path is built here, never stored. */
function linkFor(notification) {
  if (notification.entityType === 'expense') return `/expenses/${notification.entityId}`;
  if (notification.entityType === 'settlement') return '/settlements';
  if (notification.entityType === 'room') return '/dashboard';
  return null;
}

/** "just now", "12m", "3h", "5d" — a bell wants brevity, not a date. */
function shortAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { unread, notifications, isLoading, error, loadList, markRead, markAllRead } =
    useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Clicking anywhere else, or pressing Escape, closes it — the two things
  // every menu is expected to do and the two most often left out.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadList();
  };

  const open = (notification) => {
    if (!notification.read) markRead(notification.id);
    setIsOpen(false);

    const target = linkFor(notification);
    if (target) navigate(target);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-negative-500 px-1 text-[10px] font-semibold text-white"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg sm:w-96"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-5 text-brand-500" />
              </div>
            ) : error ? (
              <p className="px-4 py-8 text-center text-sm text-negative-700">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                Nothing yet. You will hear about expenses, edits and settlements in your rooms.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => open(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        notification.read ? '' : 'bg-brand-50/40'
                      }`}
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm"
                        aria-hidden="true"
                      >
                        {ICONS[notification.type] ?? '•'}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm ${
                            notification.read ? 'text-slate-600' : 'font-medium text-slate-900'
                          }`}
                        >
                          {notification.message}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {notification.room?.name} · {shortAgo(notification.createdAt)}
                        </span>
                      </span>

                      {!notification.read && (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500"
                          aria-label="Unread"
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
