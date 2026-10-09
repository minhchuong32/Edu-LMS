const authMiddleware = require("./auth.middleware");
const rbacMiddleware = require("./rbac.middleware");
const errorMiddleware = require("./error.middleware");

module.exports = {
  ...authMiddleware,
  ...rbacMiddleware,
  ...errorMiddleware,
};
