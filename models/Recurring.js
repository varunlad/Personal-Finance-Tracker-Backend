
// models/Recurring.js
const mongoose = require("mongoose");

const recurringSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // client-generated stable key (e.g., 'rec_1769004343286')
    id: { type: String, required: true, trim: true },

    type: { type: String, enum: ["EMI", "SIP", "Fixed"], required: true },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },

    recurrence: {
      type: String,
      enum: ["monthly", "quarterly", "half-yearly", "yearly", "one-time"],
      required: true,
    },

    startDate: { type: String, default: "" }, // 'YYYY-MM-DD'
    endDate:   { type: String, default: "" }, // 'YYYY-MM-DD' or ''

    stepUp: {
      enabled: { type: Boolean, default: false },
      mode:    { type: String, enum: ["amount", "percent"], default: "amount" },
      every:   { type: String, enum: ["6m", "12m"], default: "12m" },
      value:   { type: Number, default: 0 },
      from:    { type: String, default: "" }, // 'YYYY-MM-DD' or ''
    },
  },
  { timestamps: true }
);

// Fast lookups and prevent duplicates per user+id
recurringSchema.index({ userId: 1, id: 1 }, { unique: true });
recurringSchema.index({ userId: 1 });

module.exports =
  mongoose.models.Recurring || mongoose.model("Recurring", recurringSchema);
