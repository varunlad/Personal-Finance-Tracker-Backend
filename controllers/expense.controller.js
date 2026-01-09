const Expense = require("../models/Expense");
const { getMonthRange } = require("../utils/date.utils");

exports.addExpenseAndGetUpdatedData = async (req, res) => {
  try {
    const { amount, category, date } = req.body;
    const { month, year } = req.query;

    // 1. Save expense for this user on ANY date
    await Expense.create({
      userId: req.user.id,
      amount,
      category,
      date,
    });

    // 2. Fetch updated data for that month & year
    const { startDate, endDate } = getMonthRange(month, year);

    const groupedExpenses = await Expense.aggregate([
      {
        $match: {
          userId: req.user.id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          items: {
            $push: {
              amount: "$amount",
              category: "$category",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          items: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.status(201).json({
      message: "Expense added & data updated",
      data: groupedExpenses,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExpensesByMonthYear = async (req, res) => {
  try {
    const { month, year } = req.query;

    const { startDate, endDate } = getMonthRange(month, year);

    const groupedExpenses = await Expense.aggregate([
      {
        $match: {
          userId: req.user.id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          items: {
            $push: {
              amount: "$amount",
              category: "$category",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          items: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.status(200).json(groupedExpenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};