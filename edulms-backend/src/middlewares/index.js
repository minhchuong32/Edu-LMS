const authMiddleware = require("./auth.middleware");
const restrictTo = require("./role.middleware");
const checkClassScope = require("./classScope.middleware");
const errorHandler = require("./error.middleware");
const notFoundHandler = require("./notFound.middleware");
const upload = require("./upload.middleware");

module.exports = {
  authMiddleware,
  restrictTo,
  checkClassScope,
  errorHandler,
  notFoundHandler,
  upload,
};
