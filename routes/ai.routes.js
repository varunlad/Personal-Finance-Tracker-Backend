const express = require("express");
const { categorizeExpense } = require("../services/openai.service");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.post("/categorize", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Expense text is required",
      });
    }

    const category = await categorizeExpense(text);

    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({
      success: false,
      message: "AI service failed",
    });
  }
});

module.exports = router;
