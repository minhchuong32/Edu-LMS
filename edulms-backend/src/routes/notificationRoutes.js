const express = require("express");
const router = express.Router();

// GET /api/v1/notifications
router.get("/", async (req, res, next) => {
  try {
    res.status(200).json({ success: true, notifications: [] });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message: "Notification marked read (stub)" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
