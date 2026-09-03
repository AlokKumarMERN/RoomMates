import { Router } from 'express';

import * as expenseController from '../controllers/expense.controller.js';
import authenticate from '../middleware/authenticate.js';
import validate from '../middleware/validate.js';
import { createExpenseSchema, listExpensesSchema } from '../validators/expense.validators.js';

/**
 * Expenses live at two addresses, and the split is not arbitrary.
 *
 * Creating and listing are room operations — they only make sense inside one
 * room, and the room is what grants access. Reading one expense is addressed by
 * its own id, because a link to an expense should not have to carry the room id
 * as well.
 */

/**
 * Mounted under /api/rooms/:roomId/expenses, behind requireRoomMember — so by
 * the time anything here runs, `req.room` is loaded and the caller is in it.
 */
export const roomExpenseRoutes = Router({ mergeParams: true });

roomExpenseRoutes.post('/', validate(createExpenseSchema), expenseController.create);
roomExpenseRoutes.get('/', validate(listExpensesSchema, 'query'), expenseController.list);

/** Mounted at /api/expenses. Membership is checked per expense, in the service. */
const expenseRoutes = Router();

expenseRoutes.use(authenticate);
expenseRoutes.get('/:expenseId', expenseController.detail);

export default expenseRoutes;
