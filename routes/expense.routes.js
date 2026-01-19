
// routes/expense.routes.js
const express = require('express');
const {
  addExpenseAndGetUpdatedData,
  getExpensesByMonthYear,
  getDayExpenses,
  upsertDayExpenses,
  deleteExpense,
  getExpensesByDateRange,
  getCategorySummaryByMonth,
} = require('../controllers/expense.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All expense routes require auth
router.use(authMiddleware);

// Add expenses (bulk); returns updated month via ?month=&year=
router.post('/', addExpenseAndGetUpdatedData);

// Get month grouped by day: [{ date, items: [{id,amount,category,note}], total }]
router.get('/', getExpensesByMonthYear);

// Get arbitrary date range grouped by day
// Example: GET /api/expenses/range?start=2026-01-01&end=2026-01-31
router.get('/range', getExpensesByDateRange);

// Monthly category summary (includes 'Credit Card' & 'EMIs' plus existing)
router.get('/summary/category', getCategorySummaryByMonth);

// Get a specific day
router.get('/day/:date', getDayExpenses);

// Upsert a day: replace items for 'YYYY-MM-DD'
router.put('/day/:date', upsertDayExpenses);

// Delete single expense by id
router.delete('/:id', deleteExpense);

module.exports = router;
