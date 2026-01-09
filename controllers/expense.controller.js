
// controllers/expense.controller.js
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { getMonthRange, getDayRangeFromYMD } = require('../utils/date.utils');

// Normalize categories to your UI buckets
function normalizeCategory(c) {
  const s = String(c || 'other').toLowerCase();
  if (s.includes('mutual')) return 'mutualFund';
  if (s.includes('stock')) return 'stock';
  if (s.includes('shop')) return 'shopping';
  if (s.includes('groc')) return 'grocery';
  if (s.includes('rent') || s.includes('bill')) return 'rentBills';
  return 'other';
}

// --- Helper: group month by day with totals & items (id/amount/category) ---
async function getMonthGrouped(userId, month, year) {
  const { startDate, endDate } = getMonthRange(month, year);

  const grouped = await Expense.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amount' },
        items: {
          $push: {
            id: '$_id',
            amount: '$amount',
            category: '$category',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        items: 1,
        total: 1,
      },
    },
    { $sort: { date: 1 } },
  ]);

  return grouped;
}

// --- Add a single/multiple expense and return updated month ---

exports.addExpenseAndGetUpdatedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    const { expenses } = req.body;

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ message: 'expenses array is required' });
    }

    const docs = expenses.map(e => ({
      userId,
      amount: Number(e.amount),
      category: normalizeCategory(e.category),
      date: new Date(e.date)
    }));

    await Expense.insertMany(docs);

    const data = await getMonthGrouped(userId, Number(month), Number(year));
    return res.status(201).json({ message: 'Expenses added', data });
  } catch (error) {
    console.error('Bulk add error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// --- Get expenses grouped by day for an arbitrary date range ---s

exports.getExpensesByDateRange = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'start and end are required (YYYY-MM-DD)' });
    }

    // Include entire days using UTC bounds
    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate   = new Date(`${end}T23:59:59.999Z`);

    const grouped = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          total: { $sum: '$amount' },
          items: {
            $push: { id: '$_id', amount: '$amount', category: '$category' },
          },
        },
      },
      { $project: { _id: 0, date: '$_id', items: 1, total: 1 } },
      { $sort: { date: 1 } },
    ]);

    res.status(200).json(grouped);
  } catch (error) {
    console.error('getExpensesByDateRange error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// --- Get expenses grouped by day for a month ---
exports.getExpensesByMonthYear = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required' });
    }
    const data = await getMonthGrouped(userId, Number(month), Number(year));
    return res.status(200).json(data);
  } catch (error) {
    console.error('getExpensesByMonthYear error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Get a single day (line items) ---
exports.getDayExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params; // 'YYYY-MM-DD'
    const { start, end } = getDayRangeFromYMD(date);

    const docs = await Expense.find({
      userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const items = docs.map((d) => ({
      id: d._id.toString(),
      amount: d.amount,
      category: d.category,
    }));
    const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    res.status(200).json({ date, items, total });
  } catch (error) {
    console.error('getDayExpenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Upsert all items for a day: add/update/delete in one call ---
exports.upsertDayExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params; // 'YYYY-MM-DD'
    const { items = [] } = req.body;

    const { start, end } = getDayRangeFromYMD(date);

    // Existing docs for that day
    const existing = await Expense.find({ userId, date: { $gte: start, $lte: end } });
    const existingMap = new Map(existing.map((d) => [d._id.toString(), d]));

    // Track incoming ids to keep
    const keepIds = new Set();

    // 1) Update or create
    for (const it of items) {
      const amt = Number(it.amount) || 0;
      const cat = normalizeCategory(it.category);

      if (it.id && existingMap.has(it.id)) {
        await Expense.updateOne(
          { _id: it.id, userId },
          { $set: { amount: amt, category: cat } }
        );
        keepIds.add(it.id);
      } else {
        const created = await Expense.create({
          userId,
          amount: amt,
          category: cat,
          date: start, // normalize to start-of-day
        });
        keepIds.add(created._id.toString());
      }
    }

    // 2) Delete any existing items not present in incoming payload
    const toDelete = existing.filter((d) => !keepIds.has(d._id.toString())).map((d) => d._id);
    if (toDelete.length > 0) {
      await Expense.deleteMany({ _id: { $in: toDelete }, userId });
    }

    // Return updated day and month group
    const month = start.getMonth() + 1;
    const year = start.getFullYear();
    const monthData = await getMonthGrouped(userId, month, year);

    const dayItems = await Expense.find({ userId, date: { $gte: start, $lte: end } });
    const dayPayload = {
      date,
      items: dayItems.map((d) => ({
        id: d._id.toString(),
        amount: d.amount,
        category: d.category,
      })),
      total: dayItems.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    };

    res.status(200).json({ message: 'Day upserted', day: dayPayload, month: monthData });
  } catch (error) {
    console.error('upsertDayExpenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Delete single expense by id (optional) ---
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const doc = await Expense.findOne({ _id: id, userId });
    if (!doc) return res.status(404).json({ message: 'Expense not found' });

    await Expense.deleteOne({ _id: id, userId });

    res.status(204).send();
  } catch (error) {
    console.error('deleteExpense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
``
