const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");
const { notFound, errorHandler } = require("./middlewares");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", apiRoutes);

// Xử lý Route 404 & Lỗi tập trung toàn hệ thống
app.use(notFound);
app.use(errorHandler);

module.exports = app;

