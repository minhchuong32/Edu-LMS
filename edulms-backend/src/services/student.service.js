const mongoose = require("mongoose");
const User = require("../models/User");
const Class = require("../models/Class");
const TeachingAssignment = require("../models/TeachingAssignment");
const ApiError = require("../utils/ApiError");

/**
 * Get parents for a specific student with strict RBAC & ownership authorization
 * @param {String} studentId - Target student ID
 * @param {Object} currentUser - Current authenticated user (from req.user)
 */
const getStudentParents = async (studentId, currentUser) => {
  if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
    throw new ApiError(400, "Mã học sinh không hợp lệ.");
  }

  const student = await User.findById(studentId);
  if (!student) {
    throw new ApiError(404, "Không tìm thấy thông tin học sinh này.");
  }

  if (student.role !== "student") {
    throw new ApiError(400, "Tài khoản này không phải là học sinh.");
  }

  const role = currentUser.role;

  // Authorization Checks
  if (role === "admin") {
    // Admin: Full access
  } else if (role === "student") {
    // Student: Only view own parents
    if (currentUser._id.toString() !== studentId.toString()) {
      throw new ApiError(403, "Bạn không có quyền xem thông tin phụ huynh của học sinh khác.");
    }
  } else if (role === "parent") {
    // Parent: Only view if student is in childrenRefs
    const isChild =
      Array.isArray(currentUser.childrenRefs) &&
      currentUser.childrenRefs.some((cId) => cId.toString() === studentId.toString());

    if (!isChild) {
      throw new ApiError(403, "Bạn không có quyền truy cập học sinh này.");
    }
  } else if (role === "teacher") {
    // Teacher: Only view if student belongs to a class teacher manages
    if (!student.classRef) {
      throw new ApiError(403, "Giáo viên không có quyền xem thông tin học sinh chưa xếp lớp.");
    }

    const isHomeroom = await Class.exists({
      _id: student.classRef,
      homeroomTeacherRef: currentUser._id,
    });

    const isSubjectTeacher = await TeachingAssignment.exists({
      classRef: student.classRef,
      teacherRef: currentUser._id,
    });

    if (!isHomeroom && !isSubjectTeacher) {
      throw new ApiError(403, "Giáo viên không có quyền xem thông tin phụ huynh của học sinh lớp này.");
    }
  } else {
    throw new ApiError(403, "Bạn không có quyền thực hiện hành động này.");
  }

  const parents = await User.find({ role: "parent", childrenRefs: studentId }).select(
    "_id name email relationship"
  );

  return parents;
};

module.exports = {
  getStudentParents,
};
