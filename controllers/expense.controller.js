
// controllers/expense.controller.js
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const { getMonthRange, getDayRangeFromYMD, toDayKeyFromDate } = require('../utils/date.utils');

/** Normalize to canonical categories; exact labels kept for the two new ones */
function normalizeCategory(input) {
  const raw = String(input || '').trim();

  // Exact labels you want in DB
  if (raw === 'Credit Card') return 'Credit Card';
  if (raw === 'EMIs') return 'EMIs';

  const s = raw.toLowerCase();

  // Variants -> exact labels
  if (s === 'credit card' || s === 'creditcard' || s === 'credit' || s === 'cc') return 'Credit Card';
  if (s === 'emi' || s === 'emis' || s === 'installment' || s === 'instalment') return 'EMIs';

  // Existing buckets (canonical keys)
  if (s === 'grocery') return 'grocery';
  if (s === 'shopping') return 'shopping';
  if (s === 'rentbills' || s === 'rent/bills') return 'rentBills';
  if (s === 'stock' || s === 'stocks') return 'stock';
  if (s === 'mutualfund' || s === 'mutual fund') return 'mutualFund';
  if (s === 'other') return 'other';

  // Heuristics for old free-text
  if (s.includes('mutual')) return 'mutualFund';
  if (s.includes('stock')) return 'stock';
  if (s.includes('shop')) return 'shopping';
  if (s.includes('groc')) return 'grocery';
  if (s.includes('rent') || s.includes('bill')) return 'rentBills';

  return 'other';
}

/** Month grouped by day */
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
            note: '$note',
          },
        },
      },
    },
    { $project: { _id: 0, date: '$_id', items: 1, total: 1 } },
    { $sort: { date: 1 } },
  ]);

  return grouped;
}

/** POST /api/expenses?month=&year=  (bulk add/upsert by (userId, dayKey, category)) */
exports.addExpenseAndGetUpdatedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { month, year } = req.query;
    const { expenses } = req.body;

    if (!expenses || !Array.isArray(expenses) || expenses.length === 0) {
      return res.status(400).json({ message: 'expenses array is required' });
    }
    if (!month || !year) {
      return res.status(400).json({ message: 'month and year are required as query params' });
    }

    const docs = [];
    for (const e of expenses) {
      const amount = Number(e.amount);
      const category = normalizeCategory(e.category);
      const date = new Date(e.date);
      const note = typeof e.note === 'string' ? e.note.trim().slice(0, 200) : undefined;

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: `Invalid amount: ${e.amount}` });
      }
      if (!category) {
        return res.status(400).json({ message: `Invalid category: ${e.category}` });
      }
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: `Invalid date: ${e.date}` });
      }

      const dayKey = toDayKeyFromDate(date);
      const base = { userId: userObjectId, amount, category, date, dayKey };
      if (note) base.note = note;
      docs.push(base);
    }

    // Upsert to respect the unique (userId, dayKey, category)
    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { userId: doc.userId, dayKey: doc.dayKey, category: doc.category },
        update: { $set: doc },
        upsert: true,
      },
    }));
    if (ops.length) await Expense.bulkWrite(ops);

    const data = await getMonthGrouped(userId, Number(month), Number(year));
    return res.status(201).json({ message: 'Expenses added', data });
  } catch (error) {
    console.error('addExpenseAndGetUpdatedData error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** GET /api/expenses/range?start=&end= */
exports.getExpensesByDateRange = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'start and end are required (YYYY-MM-DD)' });
    }

    const startDate = new Date(`${start}T00:00:00.000Z`);
    const endDate = new Date(`${end}T23:59:59.999Z`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start/end date' });
    }

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
            $push: { id: '$_id', amount: '$amount', category: '$category', note: '$note' },
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

/** GET /api/expenses?month=&year= */
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

/** GET /api/expenses/day/:date */
exports.getDayExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.params; // 'YYYY-MM-DD'
    const { start, end } = getDayRangeFromYMD(date);

    const docs = await Expense.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const items = docs.map((d) => ({
      id: d._id.toString(),
      amount: d.amount,
      category: d.category,
      note: d.note || null,
    }));
    const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);

    res.status(200).json({ date, items, total });
  } catch (error) {
    console.error('getDayExpenses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /api/expenses/day/:date
 * Replace the entire day with provided items (idempotent).
 * Body: { items: [{ amount, category, note? }] }
 */
exports.upsertDayExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { date } = req.params; // 'YYYY-MM-DD'
    const { items = [] } = req.body;

    const { start, end } = getDayRangeFromYMD(date);

    // 1) Validate & normalize, coalesce by category
    const buckets = new Map(); // cat -> { total, note? }
    for (const it of items) {
      const amt = Number(it.amount) || 0;
      const cat = normalizeCategory(it.category);
      const note =
        typeof it.note === 'string' ? it.note.trim().slice(0, 200) : undefined;

      if (!cat) return res.status(400).json({ message: `Invalid category: ${it.category}` });
      if (amt <= 0) return res.status(400).json({ message: `Invalid amount: ${it.amount}` });

      if (!buckets.has(cat)) buckets.set(cat, { total: 0, note: '' });
      const b = buckets.get(cat);
      b.total += amt;
      if (!b.note && note) b.note = note; // first non-empty note wins
    }

    // 2) Replace entire day
    await Expense.deleteMany({ userId: userObjectId, date: { $gte: start, $lte: end } });

    // 3) Insert one doc per category with dayKey
    if (buckets.size > 0) {
      const dayKey = date; // 'YYYY-MM-DD'
      const docs = [];
      for (const [category, { total, note }] of buckets) {
        const base = { userId: userObjectId, amount: total, category, date: start, dayKey };
        if (note) base.note = note;
        docs.push(base);
      }
      if (docs.length) await Expense.insertMany(docs);
    }

    // 4) Return updated day + month
    const month = start.getMonth() + 1;
    const year = start.getFullYear();
    const monthData = await getMonthGrouped(userId, month, year);

    const dayItems = await Expense.find({
      userId: userObjectId,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const dayPayload = {
      date,
      items: dayItems.map((d) => ({
        id: d._id.toString(),
        amount: d.amount,
        category: d.category,
        note: d.note || null,
      })),
      total: dayItems.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    };

    return res.status(200).json({ message: 'Day upserted', day: dayPayload, month: monthData });
  } catch (error) {
    console.error('upsertDayExpenses error:', error);
    if (error && error.code === 11000) {
      // Unique index conflict on (userId, dayKey, category)
      return res.status(409).json({ message: 'Duplicate day/category detected. Please retry.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

/** DELETE /api/expenses/:id */
exports.deleteExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const { id } = req.params;

    const doc = await Expense.findOne({ _id: id, userId: userObjectId });
    if (!doc) return res.status(404).json({ message: 'Expense not found' });

    await Expense.deleteOne({ _id: id, userId: userObjectId });
    res.status(204).send();
  } catch (error) {
    console.error('deleteExpense error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** GET /api/expenses/summary/category?month=&year= */
exports.getCategorySummaryByMonth = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ message: 'month and year are required' });

    const { startDate, endDate } = getMonthRange(Number(month), Number(year));
    const grouped = await Expense.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, category: '$_id', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]);

    return res.status(200).json(grouped);
  } catch (err) {
    console.error('getCategorySummaryByMonth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};