import { Router } from "express";
const router = Router();
import {
  signupController,
  loginController,
} from "../controller/authController.js";
import authMiddleware from "../middleware/middleware.js";

router.post("/login", loginController);

router.post("/signup", signupController);

router.get("/user", authMiddleware, (req, res) => {
  const { id, full_name, email, created_at } = req.user;
  res.status(200).json({ id, full_name, email, created_at });
});

export default router;
