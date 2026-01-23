
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

/* --------------------- Preflight short-circuit (CORS) --------------------- */
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    if (
      origin === "https://personal-finance-tracker-bul7.vercel.app" ||
      origin === "http://localhost:5173"
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      return res.sendStatus(204);
    }
  }
  next();
});

/* ---------------------------------- CORS ---------------------------------- */
const allowedOrigins = new Set([
  "https://personal-finance-tracker-bul7.vercel.app",
  "http://localhost:5173",
]);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);            // curl/postman/no-origin
    if (allowedOrigins.has(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // safety net

// Defensive: echo ACAO for allowed origins on every response (incl. errors)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  next();
});

/* ------------------------------ Body parsing ------------------------------ */
app.use(express.json());

/* -------------------------- Logging env (redacted) ------------------------ */
function redactMongo(uri = "") {
  // mongodb+srv://user:pass@host/db?...
  try {
    const u = new URL(uri);
    if (u.username || u.password) {
      u.password = u.password ? "****" : "";
      return u.toString();
    }
  } catch {}
  return uri ? "<present>" : "<missing>";
}
console.log("[BOOT] MONGO_URI:", redactMongo(process.env.MONGO_URI));
console.log("[BOOT] JWT_SECRET present:", Boolean(process.env.JWT_SECRET));

/* ------------------------- Health routes (no DB) -------------------------- */
// Place BEFORE DB middleware, so this proves the function runs even if DB fails.
app.get("/", (_req, res) => res.send("API is running..."));
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
  });
});

/* ---------------------------------- DB ----------------------------------- */
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is not set");
  // Mongoose 8+ works without extra options
  cached.conn = await mongoose.connect(uri);
  return cached.conn;
}

// Add a DB health route AFTER we attach the DB middleware so it tests the connection too
app.get("/health/db", async (_req, res, next) => {
  try {
    const conn = await connectDB();
    const state = conn?.connection?.readyState; // 1 = connected
    res.json({ ok: true, state });
  } catch (e) {
    next(e);
  }
});

// Ensure DB is connected before handling API routes
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- Routes --------------------------------- */
// Keep /login and /signup public in authRoutes
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/profile", profileRoutes);

/* -------------------------- Global error handler -------------------------- */
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err?.name, err?.message, err?.stack);
  const status =
    err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError"
      ? 401
      : 500;
  res.status(status).json({
    ok: false,
    error: err?.name || "Error",
    message: err?.message || "Internal Server Error",
  });
});

module.exports = serverless(app);
