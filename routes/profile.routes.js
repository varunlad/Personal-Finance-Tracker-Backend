
// routes/profile.routes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { changePassword } = require("../controllers/profile.controller");

// Protect all profile routes
router.use(auth);

// PATCH /api/profile/password
router.patch("/password", changePassword);

module.exports = router;
