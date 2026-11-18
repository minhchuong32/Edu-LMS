const mongoose = require("mongoose");
const TeachingAssignment = require("../models/TeachingAssignment");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");

/**
 * Kiểm tra xem 2 khung giờ học (slot) có bị giao thoa (overlap) hay không
 */
const isSlotOverlapping = (slotA, slotB) => {
  if (Number(slotA.dayOfWeek) !== Number(slotB.dayOfWeek)) return false;
  return (
    Number(slotA.startPeriod) <= Number(slotB.endPeriod) &&
    Number(slotA.endPeriod) >= Number(slotB.startPeriod)
  );
};

/**
 * Lấy danh sách các học kỳ có khả năng xung đột thời gian
 */
const getConflictingSemesters = (semester) => {
  if (semester === "CaNam") return ["HK1", "HK2", "CaNam"];
  return [semester, "CaNam"];
};

/**
 * Kiểm tra xung đột lịch giảng dạy chi tiết
 */
const checkConflicts = async ({
  class: classId,
  subject: subjectId,
  teacher: teacherId,
  academicYear,
  semester = "CaNam",
  schedules = [],
  excludeId = null,
}) => {
  const conflictingSemesters = getConflictingSemesters(semester);

  // 1. Kiểm tra Lớp - Môn đã có giáo viên phụ trách chưa
  const existingClassSubject = await TeachingAssignment.findOne({
    class: classId,
    subject: subjectId,
    academicYear,
    semester: { $in: conflictingSemesters },
    isDeleted: false,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).populate("teacher", "fullName userCode");

  if (existingClassSubject) {
    const teacherName = existingClassSubject.teacher?.fullName || "Giáo viên khác";
    return {
      hasConflict: true,
      type: "CLASS_SUBJECT_DUPLICATE",
      message: `Lớp học và môn học này đã được phân công cho thầy/cô ${teacherName} (${existingClassSubject.semester}) trong năm học ${academicYear}! Không được phân công trùng lặp.`,
    };
  }

  // 2. Nếu có khai báo lịch chi tiết (schedules), kiểm tra trùng tiết/thứ
  if (Array.isArray(schedules) && schedules.length > 0) {
    // 2.1 Kiểm tra trùng lịch của Giáo viên
    const teacherAssignments = await TeachingAssignment.find({
      teacher: teacherId,
      academicYear,
      semester: { $in: conflictingSemesters },
      isDeleted: false,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .populate("class", "name")
      .populate("subject", "name")
      .populate("teacher", "fullName");

    for (const other of teacherAssignments) {
      if (Array.isArray(other.schedules)) {
        for (const slotOther of other.schedules) {
          for (const newSlot of schedules) {
            if (isSlotOverlapping(newSlot, slotOther)) {
              const dayLabel = newSlot.dayOfWeek === 8 ? "Chủ Nhật" : `Thứ ${newSlot.dayOfWeek}`;
              return {
                hasConflict: true,
                type: "TEACHER_SCHEDULE_CONFLICT",
                message: `Giáo viên đã có lịch dạy lớp ${other.class?.name} môn ${other.subject?.name} vào ${dayLabel} (Tiết ${slotOther.startPeriod}-${slotOther.endPeriod})!`,
              };
            }
          }
        }
      }
    }

    // 2.2 Kiểm tra trùng lịch của Lớp học
    const classAssignments = await TeachingAssignment.find({
      class: classId,
      academicYear,
      semester: { $in: conflictingSemesters },
      isDeleted: false,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .populate("subject", "name")
      .populate("teacher", "fullName")
      .populate("class", "name");

    for (const other of classAssignments) {
      if (Array.isArray(other.schedules)) {
        for (const slotOther of other.schedules) {
          for (const newSlot of schedules) {
            if (isSlotOverlapping(newSlot, slotOther)) {
              const dayLabel = newSlot.dayOfWeek === 8 ? "Chủ Nhật" : `Thứ ${newSlot.dayOfWeek}`;
              return {
                hasConflict: true,
                type: "CLASS_SCHEDULE_CONFLICT",
                message: `Lớp đã có lịch học môn ${other.subject?.name} (GV: ${other.teacher?.fullName}) vào ${dayLabel} (Tiết ${slotOther.startPeriod}-${slotOther.endPeriod})!`,
              };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false, message: null };
};

/**
 * Lấy danh sách phân công giảng dạy theo bộ lọc
 */
const getAssignments = async (query = {}) => {
  const filter = { isDeleted: false };

  if (query.class) filter.class = query.class;
  if (query.subject) filter.subject = query.subject;
  if (query.teacher) filter.teacher = query.teacher;
  if (query.academicYear) filter.academicYear = query.academicYear.trim();
  if (query.semester) filter.semester = query.semester;
  if (query.status) filter.status = query.status;
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  const assignments = await TeachingAssignment.find(filter)
    .populate({
      path: "class",
      select: "name academicYear room grade homeroomTeacher",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email")
    .sort({ academicYear: -1, "class.name": 1, "subject.name": 1 })
    .lean();

  return assignments;
};

/**
 * Lấy chi tiết phân công giảng dạy theo ID
 */
const getAssignmentById = async (id) => {
  const assignment = await TeachingAssignment.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "class",
      select: "name academicYear room grade homeroomTeacher",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email")
    .lean();

  if (!assignment) {
    const error = new Error("Phân công giảng dạy không tồn tại hoặc đã bị hủy!");
    error.statusCode = 404;
    throw error;
  }

  return assignment;
};

/**
 * Tạo mới phân công giảng dạy
 */
const createAssignment = async ({
  class: classId,
  subject: subjectId,
  teacher: teacherId,
  academicYear,
  semester = "CaNam",
  periodsPerWeek = 2,
  schedules = [],
  note = "",
  isActive = true,
}) => {
  if (!classId) {
    const error = new Error("Lớp học là thông tin bắt buộc!");
    error.statusCode = 400;
    throw error;
  }
  if (!subjectId) {
    const error = new Error("Môn học là thông tin bắt buộc!");
    error.statusCode = 400;
    throw error;
  }
  if (!teacherId) {
    const error = new Error("Giáo viên bộ môn là thông tin bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  const targetClass = await Class.findOne({ _id: classId, isDeleted: false });
  if (!targetClass) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 400;
    throw error;
  }

  const cleanYear = (academicYear || targetClass.academicYear).trim();

  const targetSubject = await Subject.findOne({ _id: subjectId, isDeleted: false });
  if (!targetSubject) {
    const error = new Error("Môn học không tồn tại hoặc đã bị ngưng hoạt động!");
    error.statusCode = 400;
    throw error;
  }

  const targetTeacher = await User.findOne({ _id: teacherId, role: "teacher" });
  if (!targetTeacher) {
    const error = new Error("Tài khoản chỉ định không tồn tại hoặc không phải là giáo viên!");
    error.statusCode = 400;
    throw error;
  }

  const conflict = await checkConflicts({
    class: classId,
    subject: subjectId,
    teacher: teacherId,
    academicYear: cleanYear,
    semester,
    schedules,
  });

  if (conflict.hasConflict) {
    const error = new Error(conflict.message);
    error.statusCode = 400;
    throw error;
  }

  const assignment = await TeachingAssignment.create({
    class: classId,
    subject: subjectId,
    teacher: teacherId,
    academicYear: cleanYear,
    semester,
    periodsPerWeek: periodsPerWeek ? Number(periodsPerWeek) : (targetSubject.periodsPerWeek || 2),
    schedules: Array.isArray(schedules) ? schedules : [],
    note: note ? note.trim() : "",
    isActive,
    isDeleted: false,
  });

  return await TeachingAssignment.findById(assignment._id)
    .populate({
      path: "class",
      select: "name academicYear room grade",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email");
};

/**
 * Cập nhật thông tin phân công giảng dạy
 */
const updateAssignment = async (id, data) => {
  const assignment = await TeachingAssignment.findOne({ _id: id, isDeleted: false });
  if (!assignment) {
    const error = new Error("Phân công giảng dạy không tồn tại hoặc đã bị hủy!");
    error.statusCode = 404;
    throw error;
  }

  const targetClassId = data.class || assignment.class;
  const targetSubjectId = data.subject || assignment.subject;
  const targetTeacherId = data.teacher || assignment.teacher;
  const targetYear = data.academicYear ? data.academicYear.trim() : assignment.academicYear;
  const targetSemester = data.semester || assignment.semester;
  const targetSchedules = data.schedules !== undefined ? data.schedules : assignment.schedules;

  if (data.teacher) {
    const teacher = await User.findOne({ _id: data.teacher, role: "teacher" });
    if (!teacher) {
      const error = new Error("Giáo viên chỉ định không hợp lệ!");
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.class) {
    const cls = await Class.findOne({ _id: data.class, isDeleted: false });
    if (!cls) {
      const error = new Error("Lớp học chỉ định không tồn tại!");
      error.statusCode = 400;
      throw error;
    }
  }

  if (data.subject) {
    const sub = await Subject.findOne({ _id: data.subject, isDeleted: false });
    if (!sub) {
      const error = new Error("Môn học chỉ định không tồn tại!");
      error.statusCode = 400;
      throw error;
    }
  }

  const conflict = await checkConflicts({
    class: targetClassId,
    subject: targetSubjectId,
    teacher: targetTeacherId,
    academicYear: targetYear,
    semester: targetSemester,
    schedules: targetSchedules,
    excludeId: id,
  });

  if (conflict.hasConflict) {
    const error = new Error(conflict.message);
    error.statusCode = 400;
    throw error;
  }

  if (data.teacher) assignment.teacher = targetTeacherId;
  if (data.class) assignment.class = targetClassId;
  if (data.subject) assignment.subject = targetSubjectId;
  if (data.academicYear) assignment.academicYear = targetYear;
  if (data.semester) assignment.semester = targetSemester;
  if (data.periodsPerWeek !== undefined) assignment.periodsPerWeek = Number(data.periodsPerWeek);
  if (data.schedules !== undefined) assignment.schedules = data.schedules;
  if (data.status) assignment.status = data.status;
  if (data.note !== undefined) assignment.note = data.note.trim();
  if (data.isActive !== undefined) assignment.isActive = Boolean(data.isActive);

  await assignment.save();

  return await TeachingAssignment.findById(assignment._id)
    .populate({
      path: "class",
      select: "name academicYear room grade",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email");
};

/**
 * Xóa/Hủy phân công giảng dạy (áp dụng soft-delete)
 */
const deleteAssignment = async (id) => {
  const assignment = await TeachingAssignment.findOne({ _id: id, isDeleted: false });
  if (!assignment) {
    const error = new Error("Phân công giảng dạy không tồn tại hoặc đã bị hủy!");
    error.statusCode = 404;
    throw error;
  }

  assignment.isDeleted = true;
  assignment.isActive = false;
  assignment.status = "suspended";
  await assignment.save();

  return { message: "Đã hủy phân công giảng dạy thành công!" };
};

/**
 * Lấy danh sách giáo viên có sẵn để lựa chọn phân công
 */
const getTeachersList = async (academicYear = null) => {
  const teachers = await User.find({ role: "teacher" })
    .select("fullName userCode email className")
    .sort({ fullName: 1 })
    .lean();

  const teachersWithStats = await Promise.all(
    teachers.map(async (teacher) => {
      const assignmentFilter = { teacher: teacher._id, isDeleted: false };
      if (academicYear) assignmentFilter.academicYear = academicYear;
      const assignmentCount = await TeachingAssignment.countDocuments(assignmentFilter);

      const classFilter = { homeroomTeacher: teacher._id, isDeleted: false };
      if (academicYear) classFilter.academicYear = academicYear;
      const homeroomClass = await Class.findOne(classFilter).select("name academicYear").lean();

      return {
        ...teacher,
        assignmentCount,
        homeroomClass: homeroomClass ? homeroomClass.name : null,
      };
    })
  );

  return teachersWithStats;
};

/**
 * Lấy thời khóa biểu/lịch giảng dạy của một giáo viên
 */
const getTeacherSchedule = async (teacherId, academicYear, semester) => {
  let resolvedTeacherId = teacherId;

  if (teacherId && !mongoose.Types.ObjectId.isValid(teacherId)) {
    try {
      const query = User.findOne({ userCode: teacherId });
      const teacherUser = query && typeof query.select === "function" ? await query.select("_id") : await query;
      if (teacherUser && teacherUser._id) {
        resolvedTeacherId = teacherUser._id;
      }
    } catch (_err) {
      // Giữ nguyên resolvedTeacherId
    }
  }

  const filter = {
    teacher: resolvedTeacherId,
    isDeleted: false,
  };
  if (academicYear) filter.academicYear = academicYear;
  if (semester) filter.semester = { $in: getConflictingSemesters(semester) };

  const assignments = await TeachingAssignment.find(filter)
    .populate("class", "name room")
    .populate("subject", "name code")
    .lean();

  return assignments;
};

module.exports = {
  checkConflicts,
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getTeachersList,
  getTeacherSchedule,
};

