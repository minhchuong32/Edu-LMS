const express = require("express");
const apiRouter = express.Router();

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const academicRoutes = require("./academicRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const gradeRoutes = require("./gradeRoutes");
const notificationRoutes = require("./notificationRoutes");
const lessonContentRoutes = require("./lessonContentRoutes");

// Mount sub-routers
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/academic", academicRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/grades", gradeRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/lesson-contents", lessonContentRoutes);

module.exports = apiRouter;
