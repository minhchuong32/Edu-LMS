const express = require("express");
const router = express.Router();

// GET /api/v1/attendance/stats
router.get("/stats", async (req, res, next) => {
  try {
    res.status(200).json({ success: true, presencePercentage: 100 });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/attendance/record
router.post("/record", async (req, res, next) => {
  try {
    res.status(201).json({ success: true, message: "Attendance registered (stub)" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
