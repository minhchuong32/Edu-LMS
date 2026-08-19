const express = require("express");
const apiRouter = express.Router();

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const academicRoutes = require("./academicRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const gradeRoutes = require("./gradeRoutes");
const notificationRoutes = require("./notificationRoutes");
const lessonContentRoutes = require("./lessonContentRoutes");
const uploadRoutes = require("./uploadRoutes");
const studentRoutes = require("./studentRoutes");
const parentRoutes = require("./parentRoutes");

// API v1 health check
apiRouter.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "EduLMS API v1 is running",
    });
});

// gắn các route con vào route chính 
apiRouter.use("/auth", authRoutes); // auth/login ; auth/logout ; ...
apiRouter.use("/users", userRoutes);
apiRouter.use("/academic", academicRoutes);
apiRouter.use("/attendance", attendanceRoutes);
apiRouter.use("/grades", gradeRoutes);
apiRouter.use("/notifications", notificationRoutes);
apiRouter.use("/lesson-contents", lessonContentRoutes);
apiRouter.use("/upload", uploadRoutes);
apiRouter.use("/students", studentRoutes);
apiRouter.use("/parents", parentRoutes);

module.exports = apiRouter;
