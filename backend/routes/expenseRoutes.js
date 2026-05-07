import { Router } from "express";
const router = Router();
import authMiddleware from "../middleware/middleware.js";
import {
  getAllExpenseController,
  addExpenseController,
  getStatesController,
} from "../controller/getAllExpenseController.js";

router.get("/getall", authMiddleware, getAllExpenseController);

router.get("/states", authMiddleware, getStatesController);

router.post("/add", authMiddleware, addExpenseController);

export default router;
