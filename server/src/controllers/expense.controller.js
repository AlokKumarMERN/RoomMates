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
