import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
} from "../controllers/investmentController.js";

const router = express.Router();

// Add Investment
router.post("/add", authMiddleware, addInvestment);

// Get All Investments
router.get("/", authMiddleware, getInvestments);

// Update Investment
router.put("/:id", authMiddleware, updateInvestment);

// Delete Investment
router.delete("/:id", authMiddleware, deleteInvestment);

export default router;
