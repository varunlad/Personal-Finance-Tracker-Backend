// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expense.routes');
const recurringRoutes = require("./routes/recurring.routes");
const profileRoutes = require('./routes/profile.routes');

const app = express();

/* ---------------------------
   CORS: whitelist-based setup
   --------------------------- */

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,     // e.g., https://personal-finance-tracker-bul7.vercel.app
  process.env.FRONTEND_URL_2,   // optional
].filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log('Incoming Origin:', req.headers.origin || '(none)');
    next();
  });
}

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow curl/Postman/health checks
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
// ✅ Express 5–compatible preflight handler:
app.options('(.*)', cors(corsOptions));

app.use(express.json());

/* ------------
   Health check
   ------------ */
app.get('/', (_req, res) => res.send('API is running...'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

/* ------
   Routes
   ------ */
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use("/api/recurring", recurringRoutes);
app.use('/api/profile', profileRoutes);

/* --------------------
   DB & Server startup
   -------------------- */
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    if (!MONGO_URI) throw new Error('MONGO_URI is not set');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('CORS allowed origins:', allowedOrigins);
    });
  } catch (err) {
    console.error('MongoDB connection/startup error:', err);
    process.exit(1);
  }
})();
