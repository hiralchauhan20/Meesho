import express from "express";
import { getShops, addShop, updateShop, deleteShop } from "../controllers/shopController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getShops);
router.post("/add", authMiddleware, addShop);
router.put("/:id", authMiddleware, updateShop);
router.delete("/:id", authMiddleware, deleteShop);

export default router;
