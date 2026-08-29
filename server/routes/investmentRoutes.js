import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getStockSummary,
  bulkDeleteInvestments,
} from "../controllers/investmentController.js";

const router = express.Router();

// Add Investment
router.post("/add", authMiddleware, addInvestment);

// Get All Investments
router.get("/", authMiddleware, getInvestments);

// Get Live Stock Summary
router.get("/stock", authMiddleware, getStockSummary);

// Update Investment
router.put("/:id", authMiddleware, updateInvestment);

// Delete Investment
router.delete("/:id", authMiddleware, deleteInvestment);

// Bulk Delete Investments
router.post("/bulk-delete", authMiddleware, bulkDeleteInvestments);

export default router;

