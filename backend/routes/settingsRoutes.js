import { Router } from "express";
import {
  getSettingsController,
  updateProfileSettingsController,
  changePasswordController,
} from "../controller/settingsController.js";
import authMiddleware from "../middleware/middleware.js";

const router = Router();

router.get("/", authMiddleware, getSettingsController);
router.patch("/profile", authMiddleware, updateProfileSettingsController);
router.patch("/password", authMiddleware, changePasswordController);

export default router;
