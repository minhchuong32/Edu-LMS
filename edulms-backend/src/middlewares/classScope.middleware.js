const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");
const Class = require("../models/Class");
const TeachingAssignment = require("../models/TeachingAssignment");
const User = require("../models/User");

/**
 * Middleware to check class scope based on user role.
 * Ensures teachers can only manipulate classes they teach or are homeroom teachers for.
 * @param {String} [paramName="classId"] Parameter name to look for class ID in req.params, req.body, or req.query
 */
const checkClassScope = (paramName = "classId") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new ApiError(401, "Yêu cầu đăng nhập trước.");
      }

      const targetParamName = typeof paramName === "string" ? paramName : "classId";

      // Attempt to resolve classId from params, body, or query
      const classId =
        req.params[targetParamName] ||
        req.params.classId ||
        req.params.id ||
        req.body[targetParamName] ||
        req.body.classId ||
        req.body.classRef ||
        req.query[targetParamName] ||
        req.query.classId ||
        req.query.classRef;

      if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
        throw new ApiError(400, "Mã lớp học không hợp lệ hoặc không tìm thấy.");
      }

      const role = req.user.role;

      // 1. Admin: full access to all classes
      if (role === "admin") {
        return next();
      }

      // 2. Teacher: allowed if homeroom teacher OR assigned in TeachingAssignment
      if (role === "teacher") {
        const isHomeroom = await Class.exists({
          _id: classId,
          homeroomTeacherRef: req.user._id,
        });

        if (isHomeroom) {
          return next();
        }

        const isSubjectTeacher = await TeachingAssignment.exists({
          classRef: classId,
          teacherRef: req.user._id,
        });

        if (isSubjectTeacher) {
          return next();
        }

        throw new ApiError(
          403,
          "Giáo viên không có quyền thao tác trên lớp học này."
        );
      }

      // 3. Student: allowed if student belongs to the class
      if (role === "student") {
        if (
          req.user.classRef &&
          req.user.classRef.toString() === classId.toString()
        ) {
          return next();
        }
        throw new ApiError(
          403,
          "Học sinh không có quyền truy cập thông tin lớp học khác."
        );
      }

      // 4. Parent: allowed if any child belongs to the class
      if (role === "parent") {
        if (req.user.childrenRefs && req.user.childrenRefs.length > 0) {
          const childInClass = await User.exists({
            _id: { $in: req.user.childrenRefs },
            classRef: classId,
          });
          if (childInClass) {
            return next();
          }
        }
        throw new ApiError(
          403,
          "Phụ huynh không có quyền truy cập thông tin lớp học này."
        );
      }

      throw new ApiError(403, "Bạn không có quyền thực hiện hành động này.");
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkClassScope;
