
// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    category: { type: String, required: true, trim: true }, // 'Credit Card' | 'EMIs' | 'grocery' | etc.
    date: { type: Date, required: true },                   // stored as Date (start-of-day for edited rows)
    dayKey: { type: String, required: true, trim: true },   // 'YYYY-MM-DD' local day (prevents dupes)
    note: { type: String, trim: true, maxlength: 200 },     // optional
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Useful indices
expenseSchema.index({ userId: 1, date: 1 });

// 🚫 One doc per (user, day, category). This blocks duplicate rows forever.
expenseSchema.index({ userId: 1, dayKey: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Expense', expenseSchema);
