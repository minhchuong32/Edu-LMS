const Class = require("../models/Class");
const Grade = require("../models/Grade");
const User = require("../models/User");
const TeachingAssignment = require("../models/TeachingAssignment");

/**
 * Lấy danh sách lớp học (hỗ trợ lọc theo năm học, khối, giáo viên chủ nhiệm, từ khóa tìm kiếm)
 */
const getClasses = async (query = {}) => {
  const filter = { isDeleted: false };

  if (query.academicYear) {
    filter.academicYear = query.academicYear.trim();
  }

  if (query.grade) {
    filter.grade = query.grade;
  }

  if (query.homeroomTeacher) {
    filter.homeroomTeacher = query.homeroomTeacher;
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    filter.$or = [{ name: searchRegex }, { room: searchRegex }];
  }

  const classes = await Class.find(filter)
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email")
    .sort({ academicYear: -1, name: 1 })
    .lean();

  // Đính kèm thống kê học sinh và số phân công bộ môn
  const classesWithStats = await Promise.all(
    classes.map(async (cls) => {
      const studentCount = await User.countDocuments({
        role: "student",
        $or: [{ classRef: cls._id }, { className: cls.name }],
      });
      const assignmentCount = await TeachingAssignment.countDocuments({
        class: cls._id,
        isDeleted: false,
      });

      return {
        ...cls,
        currentStudents: studentCount,
        studentCount,
        assignmentCount,
      };
    })
  );

  return classesWithStats;
};

/**
 * Lấy chi tiết lớp học theo ID
 */
const getClassById = async (id) => {
  const cls = await Class.findOne({ _id: id, isDeleted: false })
    .populate("grade", "level name description")
    .populate("homeroomTeacher", "fullName userCode email")
    .lean();

  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const studentCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  });
  const assignmentCount = await TeachingAssignment.countDocuments({
    class: cls._id,
    isDeleted: false,
  });

  return {
    ...cls,
    studentCount,
    assignmentCount,
  };
};

/**
 * Tạo mới một lớp học
 */
const createClass = async ({
  name,
  grade,
  academicYear,
  homeroomTeacher = null,
  room = "",
  capacity = 45,
  description = "",
  isActive = true,
}) => {
  if (!name || !name.trim()) {
    const error = new Error("Tên lớp học là bắt buộc (ví dụ: 10A1)!");
    error.statusCode = 400;
    throw error;
  }

  if (!grade) {
    const error = new Error("Khối học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  if (!academicYear || !academicYear.trim()) {
    const error = new Error("Năm học là bắt buộc (ví dụ: 2025-2026)!");
    error.statusCode = 400;
    throw error;
  }

  const cleanName = name.trim().toUpperCase();
  const cleanYear = academicYear.trim();

  // Kiểm tra Khối có tồn tại không
  const gradeExists = await Grade.findOne({ _id: grade, isDeleted: false });
  if (!gradeExists) {
    const error = new Error("Khối học không hợp lệ hoặc đã bị vô hiệu hóa!");
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra Giáo viên chủ nhiệm nếu có truyền
  if (homeroomTeacher) {
    const teacher = await User.findOne({ _id: homeroomTeacher, role: "teacher" });
    if (!teacher) {
      const error = new Error("Giáo viên chủ nhiệm chỉ định không hợp lệ hoặc không có quyền giáo viên!");
      error.statusCode = 400;
      throw error;
    }
  }

  // Kiểm tra trùng tên trong cùng năm học (Acceptance Criteria: "Hệ thống đảm bảo dữ liệu không bị trùng lặp trong cùng năm học")
  const existingClass = await Class.findOne({
    name: cleanName,
    academicYear: cleanYear,
    isDeleted: false,
  });

  if (existingClass) {
    const error = new Error(`Lớp '${cleanName}' đã tồn tại trong năm học ${cleanYear}!`);
    error.statusCode = 400;
    throw error;
  }

  const newClass = await Class.create({
    name: cleanName,
    grade,
    academicYear: cleanYear,
    homeroomTeacher: homeroomTeacher || null,
    room: room ? room.trim() : "",
    capacity: capacity ? Number(capacity) : 45,
    description: description ? description.trim() : "",
    isActive,
    isDeleted: false,
  });

  return await Class.findById(newClass._id)
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email");
};

/**
 * Cập nhật thông tin lớp học
 */
const updateClass = async (id, data) => {
  const cls = await Class.findOne({ _id: id, isDeleted: false });
  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const newName = data.name ? data.name.trim().toUpperCase() : cls.name;
  const newYear = data.academicYear ? data.academicYear.trim() : cls.academicYear;

  // Kiểm tra trùng tên trong cùng năm học nếu tên hoặc năm học thay đổi
  if (newName !== cls.name || newYear !== cls.academicYear) {
    const duplicate = await Class.findOne({
      name: newName,
      academicYear: newYear,
      _id: { $ne: id },
      isDeleted: false,
    });

    if (duplicate) {
      const error = new Error(`Lớp '${newName}' đã tồn tại trong năm học ${newYear}!`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.grade) {
    const gradeExists = await Grade.findOne({ _id: data.grade, isDeleted: false });
    if (!gradeExists) {
      const error = new Error("Khối học được chọn không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }
    cls.grade = data.grade;
  }

  if (data.homeroomTeacher !== undefined) {
    if (data.homeroomTeacher) {
      const teacher = await User.findOne({ _id: data.homeroomTeacher, role: "teacher" });
      if (!teacher) {
        const error = new Error("Giáo viên chủ nhiệm chỉ định không hợp lệ!");
        error.statusCode = 400;
        throw error;
      }
      cls.homeroomTeacher = data.homeroomTeacher;
    } else {
      cls.homeroomTeacher = null;
    }
  }

  if (data.name !== undefined) cls.name = newName;
  if (data.academicYear !== undefined) cls.academicYear = newYear;
  if (data.room !== undefined) cls.room = data.room.trim();
  if (data.capacity !== undefined) cls.capacity = Number(data.capacity);
  if (data.description !== undefined) cls.description = data.description.trim();
  if (data.isActive !== undefined) cls.isActive = Boolean(data.isActive);

  await cls.save();

  return await Class.findById(cls._id)
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email");
};

/**
 * Phân công hoặc hủy giáo viên chủ nhiệm cho lớp
 */
const assignHomeroomTeacher = async (classId, teacherId) => {
  const cls = await Class.findOne({ _id: classId, isDeleted: false });
  if (!cls) {
    const error = new Error("Lớp học không tồn tại!");
    error.statusCode = 404;
    throw error;
  }

  if (teacherId) {
    const teacher = await User.findOne({ _id: teacherId, role: "teacher" });
    if (!teacher) {
      const error = new Error("Giáo viên chỉ định không hợp lệ hoặc không có quyền giáo viên!");
      error.statusCode = 400;
      throw error;
    }

    const existingHomeroom = await Class.findOne({
      homeroomTeacher: teacherId,
      academicYear: cls.academicYear,
      _id: { $ne: classId },
      isDeleted: false,
    });

    if (existingHomeroom) {
      const error = new Error(
        `Giáo viên ${teacher.fullName} đang là Giáo viên chủ nhiệm của lớp ${existingHomeroom.name} trong năm học ${cls.academicYear}!`
      );
      error.statusCode = 400;
      throw error;
    }

    cls.homeroomTeacher = teacher._id;
  } else {
    cls.homeroomTeacher = null;
  }

  await cls.save();

  return await Class.findById(cls._id)
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email");
};

/**
 * Xóa lớp học (chặn xóa cứng nếu có dữ liệu liên quan, áp dụng soft-delete)
 */
const deleteClass = async (id) => {
  const cls = await Class.findOne({ _id: id, isDeleted: false });
  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra học sinh đang thuộc lớp này
  const studentCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  });

  // Kiểm tra phân công giảng dạy liên quan tới lớp này
  const assignmentCount = await TeachingAssignment.countDocuments({
    class: cls._id,
    isDeleted: false,
  });

  const hasRelatedData = studentCount > 0 || assignmentCount > 0;

  // Áp dụng Soft Delete theo Acceptance Criteria & DoD
  cls.isDeleted = true;
  cls.isActive = false;
  await cls.save();

  let message = `Đã xóa thành công lớp học '${cls.name}' (${cls.academicYear}).`;
  if (hasRelatedData) {
    message = `Lớp '${cls.name}' đang có ${studentCount} học sinh và ${assignmentCount} phân công môn học liên kết. Hệ thống đã chuyển lớp sang trạng thái lưu trữ (soft-delete) để bảo toàn dữ liệu học vụ.`;
  }

  return {
    message,
    hasRelatedData,
    studentCount,
    assignmentCount,
  };
};

module.exports = {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  assignHomeroomTeacher,
  deleteClass,
};
