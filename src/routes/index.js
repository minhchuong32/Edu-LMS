const express = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = express.Router();

router.get("/health", getHealth);

module.exports = router;

// GET /api/v1/health
//        ↓
// routes/index.js
//        ↓
// getHealth()
//        ↓
// health.controller.js
