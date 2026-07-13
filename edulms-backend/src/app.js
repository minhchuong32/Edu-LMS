const express = require("express");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use("/api/v1/auth", authRoutes);

module.exports = app;