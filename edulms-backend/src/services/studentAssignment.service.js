const User = require("../models/User");
const Class = require("../models/Class");
const ClassHistory = require("../models/ClassHistory");

/**
 * Lấy danh sách học sinh theo từng lớp học
 */
const getStudentsByClass = async (classId, query = {}) => {
  const cls = await Class.findOne({ _id: classId, isDeleted: false })
    .populate("grade", "level name")
    .populate("homeroomTeacher", "fullName userCode email")
    .lean();

  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const studentFilter = {
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  };

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    studentFilter.$and = [
      {
        $or: [
          { fullName: searchRegex },
          { userCode: searchRegex },
          { email: searchRegex },
        ],
      },
    ];
  }

  const students = await User.find(studentFilter)
    .select("fullName userCode email className classRef isActivated createdAt")
    .sort({ userCode: 1, fullName: 1 })
    .lean();

  // Đảm bảo sĩ số đồng bộ
  const currentStudentsCount = students.length;
  if (cls.currentStudents !== currentStudentsCount) {
    await Class.findByIdAndUpdate(cls._id, { currentStudents: currentStudentsCount });
    cls.currentStudents = currentStudentsCount;
  }

  return {
    class: cls,
    totalStudents: currentStudentsCount,
    students,
  };
};

/**
 * Lấy danh sách học sinh chưa được phân lớp (để Admin dễ dàng chọn thêm vào lớp)
 */
const getUnassignedStudents = async (query = {}) => {
  const filter = {
    role: "student",
    $or: [
      { classRef: null, className: null },
      { classRef: null, className: "" },
      { classRef: { $exists: false } },
    ],
  };

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    filter.$and = [
      {
        $or: [
          { fullName: searchRegex },
          { userCode: searchRegex },
          { email: searchRegex },
        ],
      },
    ];
  }

  const students = await User.find(filter)
    .select("fullName userCode email isActivated createdAt")
    .sort({ userCode: 1, fullName: 1 })
    .lean();

  return students;
};

/**
 * Thêm một hoặc nhiều học sinh vào lớp học
 */
const addStudentsToClass = async (classId, { studentId, studentIds, note = "" }, adminId) => {
  const cls = await Class.findOne({ _id: classId, isDeleted: false });
  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const ids = [];
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    ids.push(...studentIds);
  } else if (studentId) {
    ids.push(studentId);
  }

  if (ids.length === 0) {
    const error = new Error("Vui lòng cung cấp ít nhất một học sinh cần thêm vào lớp!");
    error.statusCode = 400;
    throw error;
  }

  // Lấy sĩ số hiện tại của lớp
  const currentCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  });

  // Kiểm tra sĩ số tối đa của lớp
  if (currentCount + ids.length > cls.capacity) {
    const error = new Error(
      `Không thể xếp lớp: Sĩ số sau khi thêm (${currentCount + ids.length}) sẽ vượt quá giới hạn tối đa của lớp (${cls.capacity} học sinh)!`
    );
    error.statusCode = 400;
    throw error;
  }

  const addedStudents = [];
  const historyRecords = [];

  for (const id of ids) {
    const student = await User.findById(id);
    if (!student || student.role !== "student") {
      const error = new Error(`Học sinh với ID ${id} không tồn tại hoặc không phải là học sinh!`);
      error.statusCode = 400;
      throw error;
    }

    // Kiểm tra học sinh đã thuộc lớp này chưa
    const isAlreadyInThisClass =
      (student.classRef && student.classRef.toString() === cls._id.toString()) ||
      student.className === cls.name;

    if (isAlreadyInThisClass) {
      const error = new Error(
        `Học sinh ${student.fullName} (${student.userCode}) đã có trong lớp ${cls.name}!`
      );
      error.statusCode = 400;
      throw error;
    }

    // Kiểm tra học sinh đã thuộc lớp khác chưa (ngăn chặn học sinh thuộc nhiều lớp hiện tại)
    const isAssignedToOtherClass =
      (student.classRef && student.classRef.toString() !== cls._id.toString()) ||
      (student.className && student.className !== cls.name);

    if (isAssignedToOtherClass) {
      const error = new Error(
        `Học sinh ${student.fullName} (${student.userCode}) hiện đang thuộc lớp khác (${student.className || "đã phân lớp"}). Không được phép xếp một học sinh vào nhiều lớp cùng lúc. Vui lòng sử dụng tính năng chuyển lớp!`
      );
      error.statusCode = 400;
      throw error;
    }

    // Gán lớp cho học sinh
    student.classRef = cls._id;
    student.className = cls.name;
    await student.save();

    addedStudents.push({
      _id: student._id,
      fullName: student.fullName,
      userCode: student.userCode,
      email: student.email,
      className: student.className,
      classRef: student.classRef,
    });

    historyRecords.push({
      student: student._id,
      action: "ASSIGN",
      fromClass: null,
      toClass: cls._id,
      academicYear: cls.academicYear,
      note: note ? note.trim() : "Xếp học sinh vào lớp",
      changedBy: adminId,
      changedAt: new Date(),
    });
  }

  // Lưu lịch sử
  if (historyRecords.length > 0) {
    await ClassHistory.insertMany(historyRecords);
  }

  // Cập nhật lại sĩ số của lớp
  const newTotal = await User.countDocuments({
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  });
  cls.currentStudents = newTotal;
  await cls.save();

  return {
    classId: cls._id,
    className: cls.name,
    capacity: cls.capacity,
    currentStudents: cls.currentStudents,
    addedCount: addedStudents.length,
    students: addedStudents,
  };
};

/**
 * Xóa học sinh khỏi lớp học
 */
const removeStudentFromClass = async (classId, studentId, { note = "" } = {}, adminId) => {
  const cls = await Class.findOne({ _id: classId, isDeleted: false });
  if (!cls) {
    const error = new Error("Lớp học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const student = await User.findById(studentId);
  if (!student || student.role !== "student") {
    const error = new Error("Học sinh không tồn tại!");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem học sinh có đang thuộc lớp này không
  const isInThisClass =
    (student.classRef && student.classRef.toString() === cls._id.toString()) ||
    student.className === cls.name;

  if (!isInThisClass) {
    const error = new Error(
      `Học sinh ${student.fullName} (${student.userCode}) không thuộc lớp ${cls.name}!`
    );
    error.statusCode = 400;
    throw error;
  }

  // Xóa khỏi lớp
  student.classRef = null;
  student.className = null;
  await student.save();

  // Ghi nhận lịch sử
  await ClassHistory.create({
    student: student._id,
    action: "REMOVE",
    fromClass: cls._id,
    toClass: null,
    academicYear: cls.academicYear,
    note: note ? note.trim() : "Xóa học sinh khỏi lớp",
    changedBy: adminId,
    changedAt: new Date(),
  });

  // Cập nhật lại sĩ số lớp
  const newTotal = await User.countDocuments({
    role: "student",
    $or: [{ classRef: cls._id }, { className: cls.name }],
  });
  cls.currentStudents = newTotal;
  await cls.save();

  return {
    message: `Đã xóa học sinh '${student.fullName}' (${student.userCode}) khỏi lớp '${cls.name}' thành công.`,
    classId: cls._id,
    className: cls.name,
    capacity: cls.capacity,
    currentStudents: cls.currentStudents,
    removedStudent: {
      _id: student._id,
      fullName: student.fullName,
      userCode: student.userCode,
    },
  };
};

/**
 * Chuyển học sinh từ lớp này sang lớp khác
 */
const transferStudent = async (
  { studentId, fromClassId, toClassId, note = "" },
  adminId
) => {
  if (!studentId) {
    const error = new Error("Học sinh là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  if (!fromClassId || !toClassId) {
    const error = new Error("Lớp nguồn (lớp cũ) và Lớp đích (lớp mới) là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  if (fromClassId.toString() === toClassId.toString()) {
    const error = new Error("Lớp chuyển đến phải khác lớp hiện tại!");
    error.statusCode = 400;
    throw error;
  }

  const [fromClass, toClass, student] = await Promise.all([
    Class.findOne({ _id: fromClassId, isDeleted: false }),
    Class.findOne({ _id: toClassId, isDeleted: false }),
    User.findById(studentId),
  ]);

  if (!fromClass) {
    const error = new Error("Lớp học cũ (nguồn) không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  if (!toClass) {
    const error = new Error("Lớp học mới (đích) không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  if (!student || student.role !== "student") {
    const error = new Error("Học sinh không tồn tại!");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra học sinh có đang thuộc lớp cũ không
  const isInFromClass =
    (student.classRef && student.classRef.toString() === fromClass._id.toString()) ||
    student.className === fromClass.name;

  if (!isInFromClass) {
    const error = new Error(
      `Học sinh ${student.fullName} (${student.userCode}) hiện không thuộc lớp ${fromClass.name}!`
    );
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra sĩ số lớp đích
  const toClassCurrentCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: toClass._id }, { className: toClass.name }],
  });

  if (toClassCurrentCount >= toClass.capacity) {
    const error = new Error(
      `Không thể chuyển lớp: Lớp đích '${toClass.name}' đã đủ sĩ số tối đa (${toClass.capacity} học sinh)!`
    );
    error.statusCode = 400;
    throw error;
  }

  // Chuyển lớp cho học sinh
  student.classRef = toClass._id;
  student.className = toClass.name;
  await student.save();

  // Ghi nhận lịch sử chuyển lớp
  const historyRecord = await ClassHistory.create({
    student: student._id,
    action: "TRANSFER",
    fromClass: fromClass._id,
    toClass: toClass._id,
    academicYear: toClass.academicYear,
    note: note ? note.trim() : `Chuyển từ lớp ${fromClass.name} sang ${toClass.name}`,
    changedBy: adminId,
    changedAt: new Date(),
  });

  // Cập nhật lại sĩ số 2 lớp
  const fromNewCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: fromClass._id }, { className: fromClass.name }],
  });
  fromClass.currentStudents = fromNewCount;
  await fromClass.save();

  const toNewCount = await User.countDocuments({
    role: "student",
    $or: [{ classRef: toClass._id }, { className: toClass.name }],
  });
  toClass.currentStudents = toNewCount;
  await toClass.save();

  return {
    message: `Đã chuyển học sinh '${student.fullName}' từ lớp '${fromClass.name}' sang lớp '${toClass.name}' thành công.`,
    student: {
      _id: student._id,
      fullName: student.fullName,
      userCode: student.userCode,
      classRef: student.classRef,
      className: student.className,
    },
    fromClass: {
      _id: fromClass._id,
      name: fromClass.name,
      currentStudents: fromClass.currentStudents,
      capacity: fromClass.capacity,
    },
    toClass: {
      _id: toClass._id,
      name: toClass.name,
      currentStudents: toClass.currentStudents,
      capacity: toClass.capacity,
    },
    history: historyRecord,
  };
};

/**
 * Lấy lịch sử phân lớp và chuyển lớp
 */
const getClassHistory = async (query = {}) => {
  const filter = {};

  if (query.studentId) {
    filter.student = query.studentId;
  }

  if (query.classId) {
    filter.$or = [{ fromClass: query.classId }, { toClass: query.classId }];
  }

  if (query.action) {
    filter.action = query.action.toUpperCase();
  }

  if (query.academicYear) {
    filter.academicYear = query.academicYear.trim();
  }

  const history = await ClassHistory.find(filter)
    .populate("student", "fullName userCode email")
    .populate("fromClass", "name academicYear room")
    .populate("toClass", "name academicYear room")
    .populate("changedBy", "fullName userCode email")
    .sort({ changedAt: -1, createdAt: -1 })
    .lean();

  return history;
};

module.exports = {
  getStudentsByClass,
  getUnassignedStudents,
  addStudentsToClass,
  removeStudentFromClass,
  transferStudent,
  getClassHistory,
};
