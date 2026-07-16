import express from "express";
import {
  addProduct,
  getProducts,
  deleteProduct,
  updateProduct,
  calculateProfit,
} from "../controllers/productController.js";

const router = express.Router();

// Add Product API
router.post("/add", addProduct);

// Get All Products API
router.get("/", getProducts);

// Delete Product API
router.delete("/:id", deleteProduct);

// Update Product API
router.put("/:id", updateProduct);

// Profit Calculation API
router.get("/profit/:id", calculateProfit);

export default router;
