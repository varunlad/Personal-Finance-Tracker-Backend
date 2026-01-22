
// api/index.js
const serverless = require("serverless-http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("../routes/authRoutes");
const expenseRoutes = require("../routes/expense.routes");
const recurringRoutes = require("../routes/recurring.routes");
const profileRoutes = require("../routes/profile.routes");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://personal-finance-tracker-bul7.vercel.app/"
  ],
  credentials: true
}));

app.use(express.json());

app.get("/", (_req, res) => res.send("API is running..."));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/profile", profileRoutes);

// Reuse Mongo connection across invocations
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  cached.conn = await mongoose.connect(process.env.MONGO_URI);
  return cached.conn;
}
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = serverless(app);