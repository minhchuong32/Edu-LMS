const authMiddleware = require("./auth.middleware");
const rbacMiddleware = require("./rbac.middleware");
const errorMiddleware = require("./error.middleware");
const lessonPermissionMiddleware = require("./lessonPermission.middleware");
const uploadMiddleware = require("./upload.middleware");

module.exports = {
  ...authMiddleware,
  ...rbacMiddleware,
  ...errorMiddleware,
  ...lessonPermissionMiddleware,
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
