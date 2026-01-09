
const express = require('express');
const {
  addExpenseAndGetUpdatedData,
  getExpensesByMonthYear,
  getDayExpenses,
  upsertDayExpenses,
  deleteExpense,
  getExpensesByDateRange, // ✅ add this import
} = require('../controllers/expense.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All expense routes require auth
router.use(authMiddleware);

// Add a single expense; optionally return updated month via ?month=&year=
router.post('/', addExpenseAndGetUpdatedData);

// Get month grouped by day: [{ date, items: [{id,amount,category}], total }]
router.get('/', getExpensesByMonthYear);

// ✅ NEW: Get arbitrary date range grouped by day
// Example: GET /api/expenses/range?start=2020-01-01&end=2025-12-31
router.get('/range', getExpensesByDateRange);

// Get a specific day
router.get('/day/:date', getDayExpenses);

// Upsert a day: replace items for 'YYYY-MM-DD'
router.put('/day/:date', upsertDayExpenses);

// Delete single expense by id
router.delete('/:id', deleteExpense);

module.exports = router;
``
