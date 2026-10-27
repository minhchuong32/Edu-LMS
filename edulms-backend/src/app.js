const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middlewares");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hỗ trợ cả /api và /api/v1
app.use("/api/v1", apiRoutes);
app.use("/api", apiRoutes);

// Xử lý Route 404 & Lỗi tập trung toàn hệ thống
app.use(notFound);
app.use(errorHandler);

module.exports = app;

