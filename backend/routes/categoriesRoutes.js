import express from "express";
import categoriesController from "../controller/categoriesController.js";
import authMiddleware from "../middleware/middleware.js";

const router = express.Router();

router.get("/", authMiddleware, categoriesController);

export default router;
