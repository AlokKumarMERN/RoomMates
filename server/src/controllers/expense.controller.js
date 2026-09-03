import * as expenseService from '../services/expense.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/response.js';

export const create = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense({
    room: req.room,
    userId: req.user._id,
    input: req.body,
  });

  sendSuccess(res, { status: 201, data: { expense } });
});

export const list = asyncHandler(async (req, res) => {
  const { expenses, total, page, limit } = await expenseService.listExpenses({
    roomId: req.room._id,
    query: req.query,
  });

  sendPaginated(res, { data: { expenses }, page, limit, total });
});

export const detail = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseForUser({
    expenseId: req.params.expenseId,
    userId: req.user._id,
  });

  sendSuccess(res, { data: { expense } });
});

export const update = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense({
    expenseId: req.params.expenseId,
    userId: req.user._id,
    input: req.body,
  });

  sendSuccess(res, { data: { expense } });
});

/**
 * A soft delete, so this returns the expense rather than 204 — the client
 * re-renders it as removed, with its history still reachable, instead of
 * dropping it out of the page as if it had never existed.
 */
export const remove = asyncHandler(async (req, res) => {
  const expense = await expenseService.deleteExpense({
    expenseId: req.params.expenseId,
    userId: req.user._id,
  });

  sendSuccess(res, { data: { expense } });
});

export const history = asyncHandler(async (req, res) => {
  const revisions = await expenseService.listRevisions({
    expenseId: req.params.expenseId,
    userId: req.user._id,
  });

  sendSuccess(res, { data: { revisions } });
});
