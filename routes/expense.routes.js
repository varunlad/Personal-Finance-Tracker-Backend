const express = require("express");
const router = express.Router();
const {
  addExpenseAndGetUpdatedData,
  getExpensesByMonthYear,
} = require("../controllers/expense.controller");
const authMiddleware = require("../middleware/authMiddleware");

// Add expense + get updated data
router.post("/", authMiddleware, addExpenseAndGetUpdatedData);

// Get expenses only
router.get("/", authMiddleware, getExpensesByMonthYear);

module.exports = router;
