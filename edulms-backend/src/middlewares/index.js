const authMiddleware = require("./auth.middleware");
const rbacMiddleware = require("./rbac.middleware");
const errorMiddleware = require("./error.middleware");
const lessonPermissionMiddleware = require("./lessonPermission.middleware");

module.exports = {
  ...authMiddleware,
  ...rbacMiddleware,
  ...errorMiddleware,
  ...lessonPermissionMiddleware,
};
