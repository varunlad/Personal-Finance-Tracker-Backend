
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

/* ------------------------- Preflight short-circuit ------------------------ */
// MUST be before any other middleware
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
console.log("allowedOrigins", allowedOrigins);
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman/no-origin
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

// Defensive: always echo ACAO for allowed origins (even if an error path responds)
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

/* --------------------------------- Health -------------------------------- */
app.get("/", (_req, res) => res.send("API is running..."));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------------------------------- DB ----------------------------------- */
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

/* -------------------------------- Routes --------------------------------- */
// NOTE: Do NOT wrap this whole router with auth middleware.
// Keep /login and /signup public.
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/profile", profileRoutes);

/* ------------------------------ Export handler --------------------------- */
module.exports = serverless(app);
