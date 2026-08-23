import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./prisma";
import authRouter from "./auth";
import adminRouter from "./admin";
import ordersRouter from "./orders";
import agentsRouter from "./agents";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/orders", ordersRouter);
app.use("/agents", agentsRouter);

app.get("/health", async (_req, res) => {
  try {
    const zones = await prisma.zone.count();
    res.json({ status: "ok", db: "connected", zones, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
