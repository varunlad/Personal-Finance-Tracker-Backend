
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

/* ----------------------------- CORS (Robust) ----------------------------- */
const PROD_FRONTEND = "https://personal-finance-tracker-bul7.vercel.app";
const LOCAL_DEV = "http://localhost:5173";

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow curl/postman/no-origin
  try {
    const url = new URL(origin);

    if (origin === PROD_FRONTEND) return true;
    if (origin === LOCAL_DEV) return true;

    // Allow Vercel preview deployments of this project:
    // e.g., https://personal-finance-tracker-bul7-abc123-user.vercel.app
    if (
      url.hostname.endsWith(".vercel.app") &&
      url.hostname.startsWith("personal-finance-tracker-bul7-")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

// 1) CORS MUST be the very first middleware
app.use(cors(corsOptions));

// 2) Ensure preflight never 404s and always returns headers
app.options("*", cors(corsOptions));

// 3) Defensive: always attach ACAO/etc. for allowed origins (even on errors)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    // echo origin instead of '*', required when credentials: true
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Vary", "Origin");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/* ------------------------------ Body parsing ----------------------------- */
app.use(express.json());

/* --------------------------------- Health -------------------------------- */
app.get("/", (_req, res) => res.send("API is running..."));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------------------------------- DB ----------------------------------- */
// Reuse Mongo connection across serverless invocations
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null };

async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not set");
  cached.conn = await mongoose.connect(process.env.MONGO_URI);
  return cached.conn;
}

// Ensure DB is connected before handling routes
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    next(e);
  }
});

/* -------------------------------- Routes --------------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/recurring", recurringRoutes);
app.use("/api/profile", profileRoutes);

/* ------------------------------ Export handler --------------------------- */
module.exports = serverless(app);
