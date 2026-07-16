import Expense from "../models/Expense.js";

// Add Expense
export const addExpense = async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, userId: req.user.id });

    res.status(201).json({
      message: "Expense Added Successfully",
      expense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Get All Expenses
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ createdAt: -1 });

    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Update Expense
export const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    res.status(200).json({
      message: "Expense Updated Successfully",
      expense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Delete Expense
export const deleteExpense = async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    res.status(200).json({
      message: "Expense Deleted Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
