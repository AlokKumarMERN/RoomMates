import { request } from './api.js';

/**
 * Notifications are addressed to a person, not a room — the bell shows
 * everything waiting across every room you are in.
 */

/**
 * One page, newest first. `unread` also comes back in the meta, so opening the
 * list refreshes the bell in the same round trip.
 *
 * @returns {Promise<{notifications: object[], unread: number, meta: object}>}
 */
export async function listNotifications(params = {}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  );

  const body = await request.raw({ url: '/notifications', method: 'GET', params: query });

  return {
    notifications: body.data.notifications,
    unread: body.data.unread,
    meta: body.meta,
  };
}

/**
 * Just the number on the bell.
 *
 * This is what gets polled, so it is deliberately the cheapest call in the app:
 * the server answers it from an index without reading a document.
 */
export function unreadCount() {
  return request({ url: '/notifications/count', method: 'GET' });
}

export function markRead(notificationId) {
  return request({ url: `/notifications/${notificationId}/read`, method: 'PATCH' });
}

export function markAllRead() {
  return request({ url: '/notifications/read-all', method: 'POST' });
}
