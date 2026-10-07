import express from "express";
import {
  getCouriers,
  addCourier,
  updateCourier,
  deleteCourier,
} from "../controllers/courierController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getCouriers);
router.post("/add", authMiddleware, addCourier);
router.put("/:id", authMiddleware, updateCourier);
router.delete("/:id", authMiddleware, deleteCourier);

export default router;
