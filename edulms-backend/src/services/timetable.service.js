const Timetable = require("../models/Timetable");
const TeachingAssignment = require("../models/TeachingAssignment");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");

/**
 * Lấy danh sách các học kỳ có khả năng xung đột thời gian
 */
const getConflictingSemesters = (semester) => {
  if (semester === "CaNam") return ["HK1", "HK2", "CaNam"];
  return [semester, "CaNam"];
};

/**
 * Chuyển đổi mã thứ sang tên tiếng Việt
 */
const getDayLabel = (dayOfWeek) => {
  const day = Number(dayOfWeek);
  if (day === 8) return "Chủ Nhật";
  return `Thứ ${day}`;
};

/**
 * Định dạng lưới thời khóa biểu tuần (2D Grid: Thứ 2-8 x Tiết 1-10)
 */
const formatWeeklyGrid = (slots = []) => {
  const days = [2, 3, 4, 5, 6, 7];
  const grid = {};

  days.forEach((day) => {
    grid[day] = {};
    for (let p = 1; p <= 10; p++) {
      grid[day][p] = null;
    }
  });

  slots.forEach((slot) => {
    const d = slot.dayOfWeek;
    const p = slot.period;
    if (!grid[d]) {
      grid[d] = {};
    }
    grid[d][p] = slot;
  });

  return grid;
};

/**
 * Kiểm tra xung đột lịch thời khóa biểu
 * 1. Trùng lịch của Giáo viên (Teacher Conflict): Cùng 1 thứ & tiết, giáo viên không thể dạy 2 lớp khác nhau
 * 2. Trùng lịch của Lớp học (Class Conflict): Cùng 1 thứ & tiết, lớp không thể học 2 môn khác nhau
 */
const checkTimetableConflict = async ({
  class: classId,
  teacher: teacherId,
  dayOfWeek,
  period,
  academicYear,
  semester = "CaNam",
  excludeId = null,
}) => {
  const conflictingSemesters = getConflictingSemesters(semester);
  const numDay = Number(dayOfWeek);
  const numPeriod = Number(period);

  const baseFilter = {
    academicYear: academicYear?.trim(),
    semester: { $in: conflictingSemesters },
    dayOfWeek: numDay,
    period: numPeriod,
    isDeleted: false,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  };

  // 1. Kiểm tra trùng tiết của Giáo viên
  if (teacherId) {
    const teacherConflict = await Timetable.findOne({
      ...baseFilter,
      teacher: teacherId,
    })
      .populate("class", "name")
      .populate("subject", "name")
      .populate("teacher", "fullName userCode")
      .lean();

    if (teacherConflict) {
      const teacherName = teacherConflict.teacher?.fullName || "Giáo viên";
      const className = teacherConflict.class?.name || "Lớp khác";
      const subjectName = teacherConflict.subject?.name || "Môn học";
      const dayLabel = getDayLabel(numDay);

      return {
        hasConflict: true,
        type: "TEACHER_PERIOD_CONFLICT",
        message: `Giáo viên ${teacherName} đã có lịch dạy lớp ${className} (môn ${subjectName}) vào ${dayLabel}, tiết ${numPeriod}!`,
        conflictSlot: teacherConflict,
      };
    }
  }

  // 2. Kiểm tra trùng tiết trong cùng một Lớp học
  if (classId) {
    const classConflict = await Timetable.findOne({
      ...baseFilter,
      class: classId,
    })
      .populate("class", "name")
      .populate("subject", "name")
      .populate("teacher", "fullName userCode")
      .lean();

    if (classConflict) {
      const className = classConflict.class?.name || "Lớp học";
      const subjectName = classConflict.subject?.name || "Môn học khác";
      const teacherName = classConflict.teacher?.fullName || "Giáo viên";
      const dayLabel = getDayLabel(numDay);

      return {
        hasConflict: true,
        type: "CLASS_PERIOD_CONFLICT",
        message: `Lớp ${className} đã có lịch học môn ${subjectName} (GV: ${teacherName}) vào ${dayLabel}, tiết ${numPeriod}!`,
        conflictSlot: classConflict,
      };
    }
  }

  return {
    hasConflict: false,
    type: null,
    message: null,
  };
};

/**
 * Xác thực tính hợp lệ của TeachingAssignment và đồng bộ thông tin
 */
const validateAndResolveAssignment = async ({
  teachingAssignment: assignmentId,
  class: classId,
  subject: subjectId,
  teacher: teacherId,
  academicYear,
  semester = "CaNam",
}) => {
  const conflictingSemesters = getConflictingSemesters(semester);

  let assignment;

  if (assignmentId) {
    assignment = await TeachingAssignment.findOne({
      _id: assignmentId,
      isDeleted: false,
    });

    if (!assignment) {
      const error = new Error("Phân công giảng dạy không tồn tại hoặc đã bị hủy!");
      error.statusCode = 404;
      throw error;
    }

    if (classId && String(assignment.class) !== String(classId)) {
      const error = new Error("Lớp học không khớp với thông tin trong phân công giảng dạy!");
      error.statusCode = 400;
      throw error;
    }

    if (subjectId && String(assignment.subject) !== String(subjectId)) {
      const error = new Error("Môn học không khớp với thông tin trong phân công giảng dạy!");
      error.statusCode = 400;
      throw error;
    }

    if (teacherId && String(assignment.teacher) !== String(teacherId)) {
      const error = new Error("Giáo viên không khớp với thông tin trong phân công giảng dạy!");
      error.statusCode = 400;
      throw error;
    }
  } else {
    if (!classId || !subjectId || !teacherId || !academicYear) {
      const error = new Error("Cần cung cấp đầy đủ Lớp, Môn học, Giáo viên và Năm học!");
      error.statusCode = 400;
      throw error;
    }

    assignment = await TeachingAssignment.findOne({
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      academicYear: academicYear.trim(),
      semester: { $in: conflictingSemesters },
      isDeleted: false,
    });

    if (!assignment) {
      const error = new Error(
        "Không tìm thấy phân công giảng dạy phù hợp cho Lớp, Môn học và Giáo viên này trong năm học đã chọn!"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  return assignment;
};

/**
 * Tạo mới 1 tiết trong Thời khóa biểu
 */
const createTimetableEntry = async (data) => {
  const {
    class: inputClass,
    subject: inputSubject,
    teacher: inputTeacher,
    teachingAssignment: inputAssignment,
    dayOfWeek,
    period,
    academicYear: inputAcademicYear,
    semester = "CaNam",
    room = "",
    note = "",
  } = data;

  if (!dayOfWeek || Number(dayOfWeek) < 2 || Number(dayOfWeek) > 8) {
    const error = new Error("Thứ trong tuần không hợp lệ (chỉ từ 2 đến 8)!");
    error.statusCode = 400;
    throw error;
  }

  if (!period || Number(period) < 1 || Number(period) > 10) {
    const error = new Error("Tiết học không hợp lệ (chỉ từ 1 đến 10)!");
    error.statusCode = 400;
    throw error;
  }

  // 1. Xác thực và liên kết với TeachingAssignment
  const assignment = await validateAndResolveAssignment({
    teachingAssignment: inputAssignment,
    class: inputClass,
    subject: inputSubject,
    teacher: inputTeacher,
    academicYear: inputAcademicYear,
    semester,
  });

  const finalClassId = inputClass || assignment.class;
  const finalSubjectId = inputSubject || assignment.subject;
  const finalTeacherId = inputTeacher || assignment.teacher;
  const finalAcademicYear = (inputAcademicYear || assignment.academicYear).trim();
  const finalSemester = semester || assignment.semester;

  // 2. Kiểm tra thực thể Lớp, Môn, Giáo viên tồn tại
  const [classDoc, subjectDoc, teacherDoc] = await Promise.all([
    Class.findOne({ _id: finalClassId, isDeleted: false }),
    Subject.findOne({ _id: finalSubjectId, isDeleted: false }),
    User.findOne({ _id: finalTeacherId }),
  ]);

  if (!classDoc) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  if (!subjectDoc) {
    const error = new Error("Môn học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  if (!teacherDoc || teacherDoc.role !== "teacher") {
    const error = new Error("Giáo viên không tồn tại hoặc tài khoản không phải là giáo viên!");
    error.statusCode = 404;
    throw error;
  }

  // 3. Kiểm tra xung đột lịch
  const conflict = await checkTimetableConflict({
    class: finalClassId,
    teacher: finalTeacherId,
    dayOfWeek: Number(dayOfWeek),
    period: Number(period),
    academicYear: finalAcademicYear,
    semester: finalSemester,
  });

  if (conflict.hasConflict) {
    const error = new Error(conflict.message);
    error.statusCode = 400;
    error.conflictType = conflict.type;
    throw error;
  }

  // 4. Tạo bản ghi Thời khóa biểu
  const newEntry = await Timetable.create({
    class: finalClassId,
    subject: finalSubjectId,
    teacher: finalTeacherId,
    teachingAssignment: assignment._id,
    dayOfWeek: Number(dayOfWeek),
    period: Number(period),
    academicYear: finalAcademicYear,
    semester: finalSemester,
    room: room || classDoc.room || "",
    note,
    isActive: true,
    isDeleted: false,
  });

  return await getTimetableById(newEntry._id);
};

/**
 * Lấy chi tiết tiết thời khóa biểu theo ID
 */
const getTimetableById = async (id) => {
  const entry = await Timetable.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "class",
      select: "name academicYear room grade homeroomTeacher",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email")
    .populate("teachingAssignment")
    .lean();

  if (!entry) {
    const error = new Error("Tiết thời khóa biểu không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  return entry;
};

/**
 * Cập nhật một tiết thời khóa biểu
 */
const updateTimetableEntry = async (id, updateData) => {
  const existing = await Timetable.findOne({ _id: id, isDeleted: false });
  if (!existing) {
    const error = new Error("Tiết thời khóa biểu không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const targetDayOfWeek =
    updateData.dayOfWeek !== undefined ? Number(updateData.dayOfWeek) : existing.dayOfWeek;
  const targetPeriod =
    updateData.period !== undefined ? Number(updateData.period) : existing.period;
  const targetAcademicYear = (
    updateData.academicYear !== undefined ? updateData.academicYear : existing.academicYear
  ).trim();
  const targetSemester =
    updateData.semester !== undefined ? updateData.semester : existing.semester;

  if (targetDayOfWeek < 2 || targetDayOfWeek > 8) {
    const error = new Error("Thứ trong tuần không hợp lệ (chỉ từ 2 đến 8)!");
    error.statusCode = 400;
    throw error;
  }

  if (targetPeriod < 1 || targetPeriod > 10) {
    const error = new Error("Tiết học không hợp lệ (chỉ từ 1 đến 10)!");
    error.statusCode = 400;
    throw error;
  }

  let finalAssignmentId = updateData.teachingAssignment || existing.teachingAssignment;
  let targetClassId = updateData.class || existing.class;
  let targetSubjectId = updateData.subject || existing.subject;
  let targetTeacherId = updateData.teacher || existing.teacher;

  // Nếu có thay đổi liên quan đến phân công giảng dạy
  if (
    updateData.teachingAssignment ||
    updateData.class ||
    updateData.subject ||
    updateData.teacher ||
    updateData.academicYear ||
    updateData.semester
  ) {
    const assignment = await validateAndResolveAssignment({
      teachingAssignment: finalAssignmentId,
      class: targetClassId,
      subject: targetSubjectId,
      teacher: targetTeacherId,
      academicYear: targetAcademicYear,
      semester: targetSemester,
    });

    finalAssignmentId = assignment._id;
    targetClassId = assignment.class;
    targetSubjectId = assignment.subject;
    targetTeacherId = assignment.teacher;
  }

  // Kiểm tra xung đột (loại trừ chính bản ghi đang cập nhật)
  const conflict = await checkTimetableConflict({
    class: targetClassId,
    teacher: targetTeacherId,
    dayOfWeek: targetDayOfWeek,
    period: targetPeriod,
    academicYear: targetAcademicYear,
    semester: targetSemester,
    excludeId: id,
  });

  if (conflict.hasConflict) {
    const error = new Error(conflict.message);
    error.statusCode = 400;
    error.conflictType = conflict.type;
    throw error;
  }

  existing.class = targetClassId;
  existing.subject = targetSubjectId;
  existing.teacher = targetTeacherId;
  existing.teachingAssignment = finalAssignmentId;
  existing.dayOfWeek = targetDayOfWeek;
  existing.period = targetPeriod;
  existing.academicYear = targetAcademicYear;
  existing.semester = targetSemester;

  if (updateData.room !== undefined) existing.room = updateData.room;
  if (updateData.note !== undefined) existing.note = updateData.note;
  if (updateData.isActive !== undefined) existing.isActive = updateData.isActive;

  await existing.save();

  return await getTimetableById(id);
};

/**
 * Xóa một tiết thời khóa biểu (Soft delete)
 */
const deleteTimetableEntry = async (id) => {
  const entry = await Timetable.findOne({ _id: id, isDeleted: false });
  if (!entry) {
    const error = new Error("Tiết thời khóa biểu không tồn tại hoặc đã bị xóa trước đó!");
    error.statusCode = 404;
    throw error;
  }

  entry.isDeleted = true;
  entry.isActive = false;
  await entry.save();

  return {
    success: true,
    message: "Xóa tiết học khỏi thời khóa biểu thành công!",
    id,
  };
};

/**
 * Lấy danh sách thời khóa biểu với bộ lọc linh hoạt
 */
const getTimetables = async (query = {}) => {
  const filter = { isDeleted: false };

  if (query.class) filter.class = query.class;
  if (query.subject) filter.subject = query.subject;
  if (query.teacher) filter.teacher = query.teacher;
  if (query.academicYear) filter.academicYear = query.academicYear.trim();
  if (query.semester) filter.semester = query.semester;
  if (query.dayOfWeek) filter.dayOfWeek = Number(query.dayOfWeek);
  if (query.period) filter.period = Number(query.period);
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  const list = await Timetable.find(filter)
    .populate({
      path: "class",
      select: "name academicYear room grade homeroomTeacher",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email")
    .populate("teachingAssignment")
    .sort({ dayOfWeek: 1, period: 1 })
    .lean();

  if (query.view === "grid") {
    return {
      total: list.length,
      list,
      grid: formatWeeklyGrid(list),
    };
  }

  return list;
};

/**
 * Lấy thời khóa biểu theo lớp học (Học sinh và Giáo viên/Admin đều xem được)
 */
const getClassTimetable = async (classId, query = {}) => {
  if (!classId) {
    const error = new Error("Mã lớp học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  const classDoc = await Class.findOne({ _id: classId, isDeleted: false })
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email")
    .lean();

  if (!classDoc) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const filter = {
    class: classId,
    isDeleted: false,
    isActive: true,
  };

  if (query.academicYear) filter.academicYear = query.academicYear.trim();
  if (query.semester) filter.semester = query.semester;

  const slots = await Timetable.find(filter)
    .populate("subject", "name code periodsPerWeek")
    .populate("teacher", "fullName userCode email")
    .sort({ dayOfWeek: 1, period: 1 })
    .lean();

  return {
    class: classDoc,
    totalSlots: slots.length,
    slots,
    grid: formatWeeklyGrid(slots),
  };
};

/**
 * Lấy thời khóa biểu theo giáo viên (Giáo viên xem lịch dạy)
 */
const getTeacherTimetable = async (teacherId, query = {}) => {
  if (!teacherId) {
    const error = new Error("Mã giáo viên là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  const teacherDoc = await User.findOne({ _id: teacherId }).select("fullName userCode email role").lean();

  if (!teacherDoc || teacherDoc.role !== "teacher") {
    const error = new Error("Giáo viên không tồn tại hoặc tài khoản không phải giáo viên!");
    error.statusCode = 404;
    throw error;
  }

  const filter = {
    teacher: teacherId,
    isDeleted: false,
    isActive: true,
  };

  if (query.academicYear) filter.academicYear = query.academicYear.trim();
  if (query.semester) filter.semester = query.semester;

  const slots = await Timetable.find(filter)
    .populate({
      path: "class",
      select: "name academicYear room grade",
      populate: { path: "grade", select: "level name" },
    })
    .populate("subject", "name code periodsPerWeek")
    .sort({ dayOfWeek: 1, period: 1 })
    .lean();

  return {
    teacher: teacherDoc,
    totalSlots: slots.length,
    slots,
    grid: formatWeeklyGrid(slots),
  };
};

/**
 * Lấy thời khóa biểu của chính người dùng đăng nhập (my-schedule)
 */
const getMyTimetable = async (user, query = {}) => {
  if (!user || !user.userId) {
    const error = new Error("Chưa xác thực thông tin người dùng!");
    error.statusCode = 401;
    throw error;
  }

  if (user.role === "teacher") {
    return await getTeacherTimetable(user.userId, query);
  }

  if (user.role === "student") {
    const student = await User.findById(user.userId).select("classRef className fullName userCode").lean();
    if (!student || !student.classRef) {
      return {
        student,
        message: "Học sinh hiện chưa được xếp vào lớp học nào!",
        totalSlots: 0,
        slots: [],
        grid: formatWeeklyGrid([]),
      };
    }
    return await getClassTimetable(student.classRef, query);
  }

  if (user.role === "admin") {
    if (query.class) {
      return await getClassTimetable(query.class, query);
    }
    if (query.teacher) {
      return await getTeacherTimetable(query.teacher, query);
    }
    return await getTimetables({ ...query, view: "grid" });
  }

  const error = new Error("Vai trò người dùng không hỗ trợ xem thời khóa biểu cá nhân!");
  error.statusCode = 403;
  throw error;
};

/**
 * Tạo / Cập nhật thời khóa biểu hàng loạt cho một Lớp học
 * Hỗ trợ tạo mới toàn bộ hoặc thay thế thời khóa biểu tuần
 */
const batchCreateOrUpdateTimetable = async ({
  class: classId,
  academicYear,
  semester = "CaNam",
  replaceExisting = false,
  slots = [],
}) => {
  if (!classId) {
    const error = new Error("Lớp học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  if (!academicYear) {
    const error = new Error("Năm học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(slots) || slots.length === 0) {
    const error = new Error("Danh sách tiết học (slots) không được để trống!");
    error.statusCode = 400;
    throw error;
  }

  const classDoc = await Class.findOne({ _id: classId, isDeleted: false });
  if (!classDoc) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  // 1. Kiểm tra tính hợp lệ và xung đột ngay trong mảng slots truyền vào
  const seenClassPeriods = new Set();
  const seenTeacherPeriods = new Set();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const d = Number(slot.dayOfWeek);
    const p = Number(slot.period);

    if (isNaN(d) || d < 2 || d > 8) {
      const error = new Error(`Slot #${i + 1}: Thứ trong tuần không hợp lệ (2 - 8)!`);
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(p) || p < 1 || p > 10) {
      const error = new Error(`Slot #${i + 1}: Tiết học không hợp lệ (1 - 10)!`);
      error.statusCode = 400;
      throw error;
    }

    const classPeriodKey = `${d}-${p}`;
    if (seenClassPeriods.has(classPeriodKey)) {
      const error = new Error(
        `Dữ liệu gửi lên bị trùng tiết học trong lớp: ${getDayLabel(d)}, Tiết ${p} xuất hiện nhiều lần!`
      );
      error.statusCode = 400;
      throw error;
    }
    seenClassPeriods.add(classPeriodKey);

    const teacherId = slot.teacher || slot.teacherId;
    if (teacherId) {
      const teacherPeriodKey = `${teacherId}-${d}-${p}`;
      if (seenTeacherPeriods.has(teacherPeriodKey)) {
        const error = new Error(
          `Giáo viên bị xếp trùng tiết trong cùng yêu cầu: ${getDayLabel(d)}, Tiết ${p}!`
        );
        error.statusCode = 400;
        throw error;
      }
      seenTeacherPeriods.add(teacherPeriodKey);
    }
  }

  // 2. Nếu replaceExisting = true, lấy ID các slot cũ của lớp để loại trừ khi kiểm tra xung đột với lớp khác
  let existingClassSlotIds = [];
  if (replaceExisting) {
    const existing = await Timetable.find({
      class: classId,
      academicYear: academicYear.trim(),
      semester,
      isDeleted: false,
    }).select("_id");
    existingClassSlotIds = existing.map((e) => e._id);
  }

  // 3. Kiểm tra từng slot với CSDL
  const preparedDocs = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const assignment = await validateAndResolveAssignment({
      teachingAssignment: slot.teachingAssignment,
      class: classId,
      subject: slot.subject,
      teacher: slot.teacher,
      academicYear,
      semester,
    });

    const teacherId = slot.teacher || assignment.teacher;
    const subjectId = slot.subject || assignment.subject;

    // Kiểm tra xung đột với các lớp khác
    const conflictingSemesters = getConflictingSemesters(semester);
    const teacherConflictQuery = {
      teacher: teacherId,
      academicYear: academicYear.trim(),
      semester: { $in: conflictingSemesters },
      dayOfWeek: Number(slot.dayOfWeek),
      period: Number(slot.period),
      isDeleted: false,
    };

    if (replaceExisting && existingClassSlotIds.length > 0) {
      teacherConflictQuery._id = { $nin: existingClassSlotIds };
    }

    const teacherConflict = await Timetable.findOne(teacherConflictQuery)
      .populate("class", "name")
      .populate("subject", "name")
      .populate("teacher", "fullName")
      .lean();

    if (teacherConflict) {
      const error = new Error(
        `Giáo viên ${teacherConflict.teacher?.fullName} đã có lịch dạy lớp ${teacherConflict.class?.name} môn ${teacherConflict.subject?.name} vào ${getDayLabel(slot.dayOfWeek)}, tiết ${slot.period}!`
      );
      error.statusCode = 400;
      error.conflictType = "TEACHER_PERIOD_CONFLICT";
      throw error;
    }

    if (!replaceExisting) {
      const classConflict = await Timetable.findOne({
        class: classId,
        academicYear: academicYear.trim(),
        semester: { $in: conflictingSemesters },
        dayOfWeek: Number(slot.dayOfWeek),
        period: Number(slot.period),
        isDeleted: false,
      })
        .populate("subject", "name")
        .populate("teacher", "fullName")
        .lean();

      if (classConflict) {
        const error = new Error(
          `Lớp đã có lịch học môn ${classConflict.subject?.name} (GV: ${classConflict.teacher?.fullName}) vào ${getDayLabel(slot.dayOfWeek)}, tiết ${slot.period}!`
        );
        error.statusCode = 400;
        error.conflictType = "CLASS_PERIOD_CONFLICT";
        throw error;
      }
    }

    preparedDocs.push({
      class: classId,
      subject: subjectId,
      teacher: teacherId,
      teachingAssignment: assignment._id,
      dayOfWeek: Number(slot.dayOfWeek),
      period: Number(slot.period),
      academicYear: academicYear.trim(),
      semester,
      room: slot.room || classDoc.room || "",
      note: slot.note || "",
      isActive: true,
      isDeleted: false,
    });
  }

  // 4. Nếu replaceExisting = true, soft delete các slot cũ
  if (replaceExisting && existingClassSlotIds.length > 0) {
    await Timetable.updateMany(
      { _id: { $in: existingClassSlotIds } },
      { $set: { isDeleted: true, isActive: false } }
    );
  }

  // 5. Lưu toàn bộ các bản ghi mới
  await Timetable.insertMany(preparedDocs);

  return await getClassTimetable(classId, { academicYear, semester });
};

module.exports = {
  checkTimetableConflict,
  createTimetableEntry,
  getTimetableById,
  updateTimetableEntry,
  deleteTimetableEntry,
  getTimetables,
  getClassTimetable,
  getTeacherTimetable,
  getMyTimetable,
  batchCreateOrUpdateTimetable,
  formatWeeklyGrid,
  getConflictingSemesters,
};
