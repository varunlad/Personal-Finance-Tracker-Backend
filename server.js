
// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expense.routes');

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Health ---
app.get('/', (_req, res) => res.send('API is running...'));
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);

// --- DB & Server ---
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
})();
