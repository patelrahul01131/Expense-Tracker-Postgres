import { Router } from "express";
import { getAnalyticsController } from "../controller/analyticsController.js";
import authMiddleware from "../middleware/middleware.js";

const router = Router();

router.get("/", authMiddleware, getAnalyticsController);

export default router;
