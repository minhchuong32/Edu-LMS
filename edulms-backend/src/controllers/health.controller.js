const mongoose = require("mongoose");

const getHealth = (req, res) => {
  const dbStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  const memoryUsage = process.memoryUsage();
  const memoryInfo = {
    rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  };

  const healthData = {
    status: isDbConnected ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(0)}s`,
    database: {
      status: dbStateMap[dbState] || "unknown",
      readyState: dbState,
    },
    system: {
      nodeVersion: process.version,
      memory: memoryInfo,
      environment: process.env.NODE_ENV || "development",
    },
  };

  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      message: "Database connection is unhealthy",
      ...healthData,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Edu-LMS Backend API is operational",
    ...healthData,
  });
};

module.exports = {
  getHealth,
};

