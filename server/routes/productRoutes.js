import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  calculateProfit,
} from "../controllers/productController.js";

const router = express.Router();

// Add Product API
router.post("/add", authMiddleware, addProduct);

// Get All Products API
router.get("/", authMiddleware, getProducts);

// Delete Product API
router.delete("/:id", authMiddleware, deleteProduct);

// Update Product API
router.put("/:id", authMiddleware, updateProduct);

// Profit Calculation API
router.get("/profit/:id", authMiddleware, calculateProfit);

export default router;
