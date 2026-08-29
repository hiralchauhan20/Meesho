import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  addOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  bulkAddOrders,
  bulkDeleteOrders,
} from "../controllers/orderController.js";

const router = express.Router();

// Add Order
router.post("/add", authMiddleware, addOrder);

// Bulk Add Orders
router.post("/bulk-add", authMiddleware, bulkAddOrders);

// Bulk Delete Orders
router.post("/bulk-delete", authMiddleware, bulkDeleteOrders);

// Get All Orders
router.get("/", authMiddleware, getOrders);

// Update Order Status
router.put("/:id", authMiddleware, updateOrderStatus);

// Delete Order
router.delete("/:id", authMiddleware, deleteOrder);

export default router;
