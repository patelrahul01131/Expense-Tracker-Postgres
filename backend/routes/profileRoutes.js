import express from "express";
import {
  createProfileController,
  getProfileController,
  updateProfileController,
} from "../controller/profileController.js";
import authMiddleware from "../middleware/middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createProfileController);
router.get("/", authMiddleware, getProfileController);
router.put("/:id", authMiddleware, updateProfileController);

export default router;
