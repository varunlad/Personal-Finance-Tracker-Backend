
// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    category: { type: String, required: true, trim: true },
    date: { type: Date, required: true }, // stored as Date; we'll use local day ranges
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
``
