import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  addExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

// Add Expense
router.post("/add", authMiddleware, addExpense);

// Get All Expenses
router.get("/", authMiddleware, getExpenses);

// Update Expense
router.put("/:id", authMiddleware, updateExpense);

// Delete Expense
router.delete("/:id", authMiddleware, deleteExpense);

export default router;
