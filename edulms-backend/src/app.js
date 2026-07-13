const express = require("express");
const cors = require("cors");
const apiRouter = require("./routes/apiRouter");

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1", apiRouter);

module.exports = app;