
// routes/recurring.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  listRecurring,
  addRecurring,
  updateRecurring,
  deleteRecurring,
} = require("../controllers/recurring.controller");

router.use(auth);

router.get("/", listRecurring);
router.post("/", addRecurring);
router.put("/:id", updateRecurring);
router.delete("/:id", deleteRecurring);

module.exports = router;
