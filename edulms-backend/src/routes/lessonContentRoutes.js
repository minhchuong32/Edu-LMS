const express = require("express");
const router = express.Router();
const lessonContentController = require("../controllers/lessonContent.controller");
const { authMiddleware, restrictTo } = require("../middlewares");

// Require authentication for all lesson content routes
router.use(authMiddleware);

// Specific route for fetching content by class and subject (with student class validation)
router.get("/class-subject", lessonContentController.getLessonContentsByClassAndSubject);

router
  .route("/")
  .get(lessonContentController.getLessonContents)
  .post(restrictTo("teacher", "admin"), lessonContentController.createLessonContent);

router
  .route("/:id")
  .get(lessonContentController.getLessonContentById)
  .put(restrictTo("teacher", "admin"), lessonContentController.updateLessonContent)
  .delete(restrictTo("teacher", "admin"), lessonContentController.deleteLessonContent);

module.exports = router;
