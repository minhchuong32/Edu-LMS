const authMiddleware = require("./auth.middleware");
const rbacMiddleware = require("./rbac.middleware");
const errorMiddleware = require("./error.middleware");
const lessonPermissionMiddleware = require("./lessonPermission.middleware");
const assignmentPermissionMiddleware = require("./assignmentPermission.middleware");
const submissionPermissionMiddleware = require("./submissionPermission.middleware");
const questionPermissionMiddleware = require("./questionPermission.middleware");
const examPermissionMiddleware = require("./examPermission.middleware");
const gradeRecordPermissionMiddleware = require("./gradeRecordPermission.middleware");
const uploadMiddleware = require("./upload.middleware");

module.exports = {
  ...authMiddleware,
  ...rbacMiddleware,
  ...errorMiddleware,
  ...lessonPermissionMiddleware,
  ...assignmentPermissionMiddleware,
  ...submissionPermissionMiddleware,
  ...questionPermissionMiddleware,
  ...examPermissionMiddleware,
  ...gradeRecordPermissionMiddleware,
  uploadFile: uploadMiddleware.uploadFile,
  uploadDocument: uploadMiddleware.uploadDocument,
  uploadSpreadsheet: uploadMiddleware.uploadSpreadsheet,
  uploadPresentation: uploadMiddleware.uploadPresentation,
  uploadArchive: uploadMiddleware.uploadArchive,
  uploadImage: uploadMiddleware.uploadImage,
  uploadVideo: uploadMiddleware.uploadVideo,
  uploadLessonMaterial: uploadMiddleware.uploadLessonMaterial,
  createUploadMiddleware: uploadMiddleware.createUploadMiddleware,
  uploadErrorHandler: uploadMiddleware.uploadErrorHandler,
};
