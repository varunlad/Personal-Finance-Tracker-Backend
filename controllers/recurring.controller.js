
// controllers/recurring.controller.js
const mongoose = require("mongoose");
const Recurring = require("../models/Recurring");

// GET /api/recurring
exports.listRecurring = async (req, res) => {
  try {
    const items = await Recurring.find({ userId: req.user.id }).lean();
    return res.status(200).json(items);
  } catch (err) {
    console.error("listRecurring error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// POST /api/recurring
exports.addRecurring = async (req, res) => {
  try {
    const body = req.body || {};
    // Minimal validation to avoid bad docs
    if (!body.id || !body.type || !body.label || body.amount == null || !body.recurrence) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doc = await Recurring.create({
      userId: new mongoose.Types.ObjectId(req.user.id),
      id: String(body.id),
      type: String(body.type),
      label: String(body.label).trim(),
      amount: Number(body.amount),
      recurrence: String(body.recurrence),
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      stepUp: {
        enabled: !!body?.stepUp?.enabled,
        mode: body?.stepUp?.mode || "amount",
        every: body?.stepUp?.every || "12m",
        value: Number(body?.stepUp?.value || 0),
        from: body?.stepUp?.from || "",
      },
    });

    return res.status(201).json(doc);
  } catch (err) {
    if (err && err.code === 11000) {
      // Unique index violation: (userId,id)
      return res.status(409).json({ message: "A recurring item with this id already exists" });
    }
    console.error("addRecurring error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/recurring/:id
exports.updateRecurring = async (req, res) => {
  try {
    const id = String(req.params.id);
    const body = req.body || {};

    const update = {
      type: String(body.type),
      label: String(body.label).trim(),
      amount: Number(body.amount),
      recurrence: String(body.recurrence),
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      stepUp: {
        enabled: !!body?.stepUp?.enabled,
        mode: body?.stepUp?.mode || "amount",
        every: body?.stepUp?.every || "12m",
        value: Number(body?.stepUp?.value || 0),
        from: body?.stepUp?.from || "",
      },
    };

    const updated = await Recurring.findOneAndUpdate(
      { userId: req.user.id, id },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("updateRecurring error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/recurring/:id
exports.deleteRecurring = async (req, res) => {
  try {
    const id = String(req.params.id);

    const deleted = await Recurring.findOneAndDelete({
      userId: req.user.id,
      id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Item not found" });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("deleteRecurring error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};