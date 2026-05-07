import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import authRoutes from "./routes/authRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import categoriesRoutes from "./routes/categoriesRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000;

app.use("/api/auth", authRoutes);

app.use("/api/expense", expenseRoutes);

app.use("/api/categories", categoriesRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/groups", groupRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/settings", settingsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
