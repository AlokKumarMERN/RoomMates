import * as notificationService from '../services/notification.service.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

export const list = asyncHandler(async (req, res) => {
  const { notifications, total, unread, page, limit } = await notificationService.listForUser({
    userId: req.user._id,
    query: req.query,
  });

  // `unread` rides in the meta so opening the list refreshes the bell in the
  // same round trip — the two are always read together.
  sendPaginated(res, { data: { notifications, unread }, page, limit, total });
});

/** The bell polls this. Deliberately tiny — a count and nothing else. */
export const count = asyncHandler(async (req, res) => {
  const unread = await notificationService.unreadCount(req.user._id);
  sendSuccess(res, { data: { unread } });
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead({
    notificationId: req.params.notificationId,
    userId: req.user._id,
  });

  // Already read, or somebody else's — the query matches neither, and the
  // client has no business learning which of the two it was.
  if (!notification) {
    throw ApiError.notFound('Notification not found.', 'NOTIFICATION_NOT_FOUND');
  }

  const unread = await notificationService.unreadCount(req.user._id);
  sendSuccess(res, { data: { notification, unread } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const marked = await notificationService.markAllRead(req.user._id);
  sendSuccess(res, { data: { marked, unread: 0 } });
});
