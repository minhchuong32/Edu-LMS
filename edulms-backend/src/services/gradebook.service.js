const mongoose = require("mongoose");
const GradeRecord = require("../models/GradeRecord");
const TeachingAssignment = require("../models/TeachingAssignment");
const User = require("../models/User");
const Class = require("../models/Class");

const {
  DEFAULT_GRADE_WEIGHTS,
  SUPPORTED_GRADE_TYPES,
  SUPPORTED_SEMESTERS,
} = GradeRecord;

/**
 * Tạo lỗi nghiệp vụ có gắn statusCode chuẩn HTTP
 */
const createAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Đọc cấu hình hệ số từ biến môi trường GRADE_WEIGHT_CONFIG (nếu có)
 */
const loadEnvGradeWeights = () => {
  if (!process.env.GRADE_WEIGHT_CONFIG) return {};
  try {
    const parsed = JSON.parse(process.env.GRADE_WEIGHT_CONFIG);
    if (parsed && typeof parsed === "object") {
      const validEntries = {};
      for (const [key, val] of Object.entries(parsed)) {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          validEntries[key.toLowerCase().trim()] = num;
        }
      }
      return validEntries;
    }
  } catch {
    // Bỏ qua nếu JSON cấu hình trong env không hợp lệ
  }
  return {};
};

// Trạng thái cấu hình hệ số điểm trong runtime (thay vì hard-code cố định)
let runtimeGradeWeights = {
  ...DEFAULT_GRADE_WEIGHTS,
  ...loadEnvGradeWeights(),
};

/**
 * Lấy bảng cấu hình hệ số điểm hiện tại (có thể gộp với overrides tùy chọn)
 * @param {Record<string, number>} [overrides={}]
 * @returns {Record<string, number>}
 */
const getGradeWeightConfig = (overrides = {}) => {
  const merged = {
    ...DEFAULT_GRADE_WEIGHTS,
    ...loadEnvGradeWeights(),
    ...runtimeGradeWeights,
  };

  if (overrides && typeof overrides === "object") {
    for (const [key, val] of Object.entries(overrides)) {
      const num = Number(val);
      if (Number.isFinite(num) && num > 0) {
        merged[key.toLowerCase().trim()] = num;
      }
    }
  }

  return merged;
};

/**
 * Cập nhật cấu hình hệ số điểm trong hệ thống
 * @param {Record<string, number>} newWeights
 * @returns {Record<string, number>}
 */
const setGradeWeightConfig = (newWeights = {}) => {
  if (!newWeights || typeof newWeights !== "object" || Array.isArray(newWeights)) {
    throw createAppError("Cấu hình hệ số điểm không hợp lệ", 400);
  }

  const nextWeights = { ...runtimeGradeWeights };

  for (const [rawKey, rawVal] of Object.entries(newWeights)) {
    const key = String(rawKey).toLowerCase().trim();
    const num = Number(rawVal);

    if (
      rawVal === null ||
      rawVal === undefined ||
      rawVal === "" ||
      typeof rawVal === "boolean" ||
      Number.isNaN(num) ||
      !Number.isFinite(num) ||
      num <= 0
    ) {
      throw createAppError(
        `Hệ số cho loại điểm '${rawKey}' phải là một số dương lớn hơn 0`,
        400
      );
    }

    nextWeights[key] = num;
  }

  runtimeGradeWeights = nextWeights;
  return { ...runtimeGradeWeights };
};

/**
 * Khôi phục cấu hình hệ số điểm về mặc định ban đầu
 */
const resetGradeWeightConfig = () => {
  runtimeGradeWeights = {
    ...DEFAULT_GRADE_WEIGHTS,
    ...loadEnvGradeWeights(),
  };
  return { ...runtimeGradeWeights };
};

/**
 * Xác định hệ số (weight) cho một loại điểm cụ thể từ cấu hình
 * @param {string} gradeType
 * @param {number|string} [explicitWeight]
 * @param {Record<string, number>} [customWeightConfig]
 * @returns {number}
 */
const resolveGradeWeight = (gradeType, explicitWeight, customWeightConfig = {}) => {
  if (
    explicitWeight !== undefined &&
    explicitWeight !== null &&
    String(explicitWeight).trim() !== ""
  ) {
    if (typeof explicitWeight === "boolean") {
      throw createAppError("Hệ số điểm (weight) phải là số dương lớn hơn 0", 400);
    }
    const numericWeight = Number(explicitWeight);
    if (
      Number.isNaN(numericWeight) ||
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      throw createAppError("Hệ số điểm (weight) phải là số dương lớn hơn 0", 400);
    }
    return numericWeight;
  }

  const normalizedType = String(gradeType || "").toLowerCase().trim();
  const config = getGradeWeightConfig(customWeightConfig);
  return config[normalizedType] !== undefined ? config[normalizedType] : 1;
};

/**
 * Kiểm tra và chuẩn hóa giá trị điểm số (value phải nằm trong khoảng 0 - 10)
 * @param {number|string} value
 * @returns {number}
 */
const validateGradeValue = (value) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === "" ||
    typeof value === "boolean"
  ) {
    throw createAppError("Giá trị điểm (value) là bắt buộc", 400);
  }

  const numericValue = Number(value);
  if (
    Number.isNaN(numericValue) ||
    !Number.isFinite(numericValue) ||
    numericValue < 0 ||
    numericValue > 10
  ) {
    throw createAppError(
      "Điểm số (value) phải nằm trong khoảng từ 0 đến 10",
      400
    );
  }

  return Math.round(numericValue * 100) / 100;
};

/**
 * Tính điểm trung bình theo hệ số được cấu hình từ danh sách GradeRecord
 * @param {Array<{ value: number, weight?: number, gradeType?: string }>} records
 * @param {Record<string, number>} [customWeightConfig={}] - Cấu hình hệ số tùy chỉnh (nếu truyền sẽ ưu tiên áp dụng theo gradeType)
 * @param {number} [precision=1] - Số chữ số thập phân làm tròn (mặc định 1 chữ số theo chuẩn THPT)
 * @returns {number|null}
 */
const calculateWeightedAverage = (
  records = [],
  customWeightConfig = {},
  precision = 1
) => {
  if (!Array.isArray(records) || records.length === 0) return null;

  const hasCustomOverride =
    customWeightConfig &&
    typeof customWeightConfig === "object" &&
    Object.keys(customWeightConfig).length > 0;
  const weightMap = getGradeWeightConfig(customWeightConfig);

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const item of records) {
    if (!item || typeof item !== "object") continue;

    const rawVal = item.value !== undefined ? item.value : item.score;
    if (
      rawVal === null ||
      rawVal === undefined ||
      rawVal === "" ||
      typeof rawVal === "boolean"
    ) {
      continue;
    }

    const numericVal = Number(rawVal);
    if (
      Number.isNaN(numericVal) ||
      !Number.isFinite(numericVal) ||
      numericVal < 0 ||
      numericVal > 10
    ) {
      continue;
    }

    const normalizedType = item.gradeType
      ? String(item.gradeType).toLowerCase().trim()
      : "";

    let itemWeight;

    // Nếu người gọi truyền customWeightConfig cho gradeType đó thì ưu tiên hệ số cấu hình truyền vào
    if (
      hasCustomOverride &&
      normalizedType &&
      customWeightConfig[normalizedType] !== undefined
    ) {
      itemWeight = Number(customWeightConfig[normalizedType]);
    } else if (
      item.weight !== undefined &&
      item.weight !== null &&
      typeof item.weight !== "boolean" &&
      Number.isFinite(Number(item.weight)) &&
      Number(item.weight) > 0
    ) {
      itemWeight = Number(item.weight);
    } else if (normalizedType && weightMap[normalizedType] !== undefined) {
      itemWeight = Number(weightMap[normalizedType]);
    } else {
      itemWeight = 1;
    }

    if (!Number.isFinite(itemWeight) || itemWeight <= 0) continue;

    totalWeightedScore += numericVal * itemWeight;
    totalWeight += itemWeight;
  }

  if (totalWeight === 0) return null;

  const factor = Math.pow(10, precision);
  return Math.round((totalWeightedScore / totalWeight) * factor) / factor;
};

/**
 * Tính điểm Trung bình môn (TBM) theo nhóm điểm thường xuyên, giữa kỳ, cuối kỳ
 * Sử dụng hệ số có thể cấu hình (mặc định đọc từ runtimeGradeWeights: regular=1, midterm=2, final=3)
 * @param {Array<number>} coeff1 Danh sách điểm thường xuyên (Miệng/15 phút)
 * @param {Array<number>} coeff2 Danh sách điểm định kỳ (1 Tiết/Giữa kỳ)
 * @param {Array<number>} coeff3 Danh sách điểm thi cuối kỳ
 * @param {object} [weightOptions={}] Cấu hình hệ số tùy chọn { coeff1, coeff2, coeff3 } hoặc { regular, midterm, final }
 * @returns {number|null} Điểm TBM làm tròn 1 chữ số thập phân
 */
const calculateSubjectGPA = (
  coeff1 = [],
  coeff2 = [],
  coeff3 = [],
  weightOptions = {}
) => {
  const currentWeights = getGradeWeightConfig(weightOptions);
  const w1 =
    Number(
      weightOptions.coeff1 ??
        weightOptions.regular ??
        currentWeights.regular ??
        1
    ) || 1;
  const w2 =
    Number(
      weightOptions.coeff2 ??
        weightOptions.midterm ??
        currentWeights.midterm ??
        2
    ) || 2;
  const w3 =
    Number(
      weightOptions.coeff3 ?? weightOptions.final ?? currentWeights.final ?? 3
    ) || 3;

  const valid1 = (Array.isArray(coeff1) ? coeff1 : []).filter(
    (score) => typeof score === "number" && !isNaN(score)
  );
  const valid2 = (Array.isArray(coeff2) ? coeff2 : []).filter(
    (score) => typeof score === "number" && !isNaN(score)
  );
  const valid3 = (Array.isArray(coeff3) ? coeff3 : []).filter(
    (score) => typeof score === "number" && !isNaN(score)
  );

  const sum1 = valid1.reduce((acc, val) => acc + val, 0);
  const sum2 = valid2.reduce((acc, val) => acc + val, 0);
  const sum3 = valid3.reduce((acc, val) => acc + val, 0);

  const totalCoefficients =
    valid1.length * w1 + valid2.length * w2 + valid3.length * w3;

  if (totalCoefficients === 0) return null;

  const rawGpa = (sum1 * w1 + sum2 * w2 + sum3 * w3) / totalCoefficients;
  return Math.round(rawGpa * 10) / 10;
};

/**
 * Tính Điểm trung bình chung tích lũy (Overall GPA)
 * @param {Array<{ subjectName: string, gpa: number, weight?: number }>} subjects
 * @returns {number|null}
 */
const calculateOverallGPA = (subjects = []) => {
  const validSubjects = subjects.filter(
    (sub) => typeof sub.gpa === "number" && !isNaN(sub.gpa)
  );

  if (validSubjects.length === 0) return null;

  const totalWeightedSum = validSubjects.reduce((acc, sub) => {
    const weight = sub.weight || 1;
    return acc + sub.gpa * weight;
  }, 0);

  const totalWeights = validSubjects.reduce(
    (acc, sub) => acc + (sub.weight || 1),
    0
  );

  const overallGpa = totalWeightedSum / totalWeights;
  return Math.round(overallGpa * 10) / 10;
};

/**
 * Xếp loại học lực theo điểm trung bình tổng kết chuẩn Bộ GD&ĐT THPT
 * @param {number} gpa Điểm tổng kết hệ 10
 * @returns {string} 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Kém' | 'Chưa xếp loại'
 */
const classifyAcademicPerformance = (gpa) => {
  if (typeof gpa !== "number" || isNaN(gpa)) return "Chưa xếp loại";
  if (gpa >= 9.0) return "Xuất sắc";
  if (gpa >= 8.0) return "Giỏi";
  if (gpa >= 6.5) return "Khá";
  if (gpa >= 5.0) return "Trung bình";
  if (gpa >= 3.5) return "Yếu";
  return "Kém";
};

/**
 * Kiểm tra quyền sở hữu TeachingAssignment của Giáo viên
 */
const verifyTeacherAssignmentOwnership = async (
  teachingAssignmentId,
  user,
  preloadedTa = null
) => {
  let ta = preloadedTa;
  if (!ta) {
    if (!teachingAssignmentId) {
      throw createAppError(
        "Phân công giảng dạy (teachingAssignment) là bắt buộc",
        400
      );
    }
    if (!mongoose.Types.ObjectId.isValid(teachingAssignmentId)) {
      throw createAppError(
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
        400
      );
    }

    ta = await TeachingAssignment.findOne({
      _id: teachingAssignmentId,
      isDeleted: false,
    });

    if (!ta) {
      throw createAppError(
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa",
        404
      );
    }
  }

  if (user) {
    const { role, userId } = user;
    if (!["admin", "teacher"].includes(role)) {
      throw createAppError(
        `Tài khoản với vai trò '${role}' không có quyền nhập hoặc sửa điểm!`,
        403
      );
    }

    const assignedTeacherId = (ta.teacher?._id || ta.teacher)?.toString();
    const currentUserId = (userId || user._id || user.id)?.toString();

    if (role === "teacher" && assignedTeacherId !== currentUserId) {
      throw createAppError(
        "Bạn không được phân công giảng dạy lớp và môn học này, không có quyền nhập hoặc sửa điểm!",
        403
      );
    }
  }

  return ta;
};

/**
 * Kiểm tra học sinh tồn tại và thuộc lớp của TeachingAssignment (nếu học sinh đã có thông tin lớp)
 */
const verifyStudentForTeachingAssignment = async (studentId, teachingAssignment) => {
  if (!studentId) {
    throw createAppError("Mã học sinh (student) là bắt buộc", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw createAppError("Mã học sinh (student) không hợp lệ", 400);
  }

  const studentDoc = await User.findOne({
    _id: studentId,
    isDeleted: { $ne: true },
  });

  if (!studentDoc) {
    throw createAppError("Học sinh không tồn tại trong hệ thống", 404);
  }

  if (studentDoc.role && studentDoc.role !== "student") {
    throw createAppError("Tài khoản được chọn không phải là học sinh", 400);
  }

  const assignedClassId = (
    teachingAssignment?.class?._id || teachingAssignment?.class
  )?.toString();

  if (assignedClassId) {
    if (studentDoc.classRef) {
      if (studentDoc.classRef.toString() !== assignedClassId) {
        throw createAppError(
          "Học sinh không thuộc lớp học của phân công giảng dạy này!",
          400
        );
      }
    } else if (studentDoc.className) {
      const classDoc = await Class.findOne({
        _id: assignedClassId,
        isDeleted: false,
      });
      if (
        classDoc &&
        classDoc.name &&
        classDoc.name.toLowerCase() !== studentDoc.className.toLowerCase()
      ) {
        throw createAppError(
          "Học sinh không thuộc lớp học của phân công giảng dạy này!",
          400
        );
      }
    }
  }

  return studentDoc;
};

/**
 * Nhập mới một bản ghi điểm (GradeRecord)
 */
const createGradeRecord = async (data = {}, context = {}) => {
  const { user, targetTeachingAssignment } = context;

  const {
    student,
    teachingAssignment,
    semester = "HK1",
    gradeType,
    value,
    weight,
    note = "",
  } = data;

  const validatedValue = validateGradeValue(value);

  if (!gradeType || !String(gradeType).trim()) {
    throw createAppError("Loại điểm (gradeType) là bắt buộc", 400);
  }
  const normalizedGradeType = String(gradeType).toLowerCase().trim();
  if (!SUPPORTED_GRADE_TYPES.includes(normalizedGradeType)) {
    throw createAppError(
      `Loại điểm '${gradeType}' không hợp lệ. Các loại điểm hỗ trợ: ${SUPPORTED_GRADE_TYPES.join(", ")}`,
      400
    );
  }

  const normalizedSemester = String(semester || "HK1").trim();
  if (!SUPPORTED_SEMESTERS.includes(normalizedSemester)) {
    throw createAppError(
      `Học kỳ '${semester}' không hợp lệ. Chỉ chấp nhận: ${SUPPORTED_SEMESTERS.join(", ")}`,
      400
    );
  }

  const resolvedWeight = resolveGradeWeight(normalizedGradeType, weight);

  const taDoc = await verifyTeacherAssignmentOwnership(
    teachingAssignment,
    user,
    targetTeachingAssignment
  );

  await verifyStudentForTeachingAssignment(student, taDoc);

  const actorId = user?.userId || user?._id || user?.id || null;

  const newRecord = new GradeRecord({
    student,
    teachingAssignment: taDoc._id,
    semester: normalizedSemester,
    gradeType: normalizedGradeType,
    value: validatedValue,
    weight: resolvedWeight,
    note: note ? String(note).trim() : "",
    createdBy: actorId,
    updatedBy: actorId,
  });

  return await newRecord.save();
};

/**
 * Cập nhật một bản ghi điểm (GradeRecord)
 */
const updateGradeRecord = async (id, data = {}, context = {}) => {
  const { user, targetGradeRecord, targetTeachingAssignment } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bản ghi điểm không hợp lệ", 400);
  }

  let recordDoc = targetGradeRecord;
  if (!recordDoc) {
    recordDoc = await GradeRecord.findOne({ _id: id, isDeleted: false });
    if (!recordDoc) {
      throw createAppError("Bản ghi điểm không tồn tại hoặc đã bị xóa", 404);
    }
  }

  await verifyTeacherAssignmentOwnership(
    recordDoc.teachingAssignment,
    user,
    targetTeachingAssignment
  );

  const { value, gradeType, weight, semester, note } = data;

  if (value !== undefined) {
    recordDoc.value = validateGradeValue(value);
  }

  if (semester !== undefined) {
    const normalizedSemester = String(semester).trim();
    if (!SUPPORTED_SEMESTERS.includes(normalizedSemester)) {
      throw createAppError(
        `Học kỳ '${semester}' không hợp lệ. Chỉ chấp nhận: ${SUPPORTED_SEMESTERS.join(", ")}`,
        400
      );
    }
    recordDoc.semester = normalizedSemester;
  }

  if (gradeType !== undefined) {
    const normalizedGradeType = String(gradeType).toLowerCase().trim();
    if (!SUPPORTED_GRADE_TYPES.includes(normalizedGradeType)) {
      throw createAppError(
        `Loại điểm '${gradeType}' không hợp lệ. Các loại điểm hỗ trợ: ${SUPPORTED_GRADE_TYPES.join(", ")}`,
        400
      );
    }
    recordDoc.gradeType = normalizedGradeType;

    // Nếu đổi loại điểm mà không truyền hệ số riêng thì tự động cập nhật hệ số theo cấu hình mới
    if (weight === undefined) {
      recordDoc.weight = resolveGradeWeight(normalizedGradeType);
    }
  }

  if (weight !== undefined) {
    recordDoc.weight = resolveGradeWeight(recordDoc.gradeType, weight);
  }

  if (note !== undefined) {
    recordDoc.note = String(note).trim();
  }

  const actorId = user?.userId || user?._id || user?.id || null;
  if (actorId) {
    recordDoc.updatedBy = actorId;
  }

  return await recordDoc.save();
};

/**
 * Xóa mềm một bản ghi điểm (GradeRecord)
 */
const deleteGradeRecord = async (id, context = {}) => {
  const { user, targetGradeRecord, targetTeachingAssignment } = context;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createAppError("Mã bản ghi điểm không hợp lệ", 400);
  }

  let recordDoc = targetGradeRecord;
  if (!recordDoc) {
    recordDoc = await GradeRecord.findOne({ _id: id, isDeleted: false });
    if (!recordDoc) {
      throw createAppError("Bản ghi điểm không tồn tại hoặc đã bị xóa", 404);
    }
  }

  await verifyTeacherAssignmentOwnership(
    recordDoc.teachingAssignment,
    user,
    targetTeachingAssignment
  );

  recordDoc.isDeleted = true;
  const actorId = user?.userId || user?._id || user?.id || null;
  if (actorId) {
    recordDoc.updatedBy = actorId;
  }

  await recordDoc.save();
  return null;
};

/**
 * Lưu hàng loạt (Bulk Upsert) nhiều đầu điểm của học sinh trong một lần thao tác
 * @param {object} payload - { teachingAssignment, semester, records: Array }
 * @param {object} context - { user, targetTeachingAssignment }
 */
const bulkUpsertGradeRecords = async (payload = {}, context = {}) => {
  const { user, targetTeachingAssignment } = context;
  const {
    teachingAssignment: rootTaId,
    semester: rootSemester = "HK1",
    records = [],
  } = payload;

  if (!Array.isArray(records) || records.length === 0) {
    throw createAppError(
      "Danh sách điểm cần lưu (records) không được để trống",
      400
    );
  }

  const primaryTaId = rootTaId || records[0]?.teachingAssignment;
  const taDoc = await verifyTeacherAssignmentOwnership(
    primaryTaId,
    user,
    targetTeachingAssignment
  );

  const actorId = user?.userId || user?._id || user?.id || null;
  const savedRecords = [];

  for (const item of records) {
    if (!item || typeof item !== "object") continue;

    const itemStudentId = item.student?._id || item.student;
    const itemGradeType = String(item.gradeType || "")
      .toLowerCase()
      .trim();
    const itemSemester = String(item.semester || rootSemester || "HK1").trim();

    if (!itemStudentId || !mongoose.Types.ObjectId.isValid(itemStudentId)) {
      throw createAppError("Mã học sinh (student) trong danh sách không hợp lệ", 400);
    }

    if (!SUPPORTED_GRADE_TYPES.includes(itemGradeType)) {
      throw createAppError(
        `Loại điểm '${item.gradeType}' không hợp lệ. Các loại điểm hỗ trợ: ${SUPPORTED_GRADE_TYPES.join(", ")}`,
        400
      );
    }

    if (!SUPPORTED_SEMESTERS.includes(itemSemester)) {
      throw createAppError(
        `Học kỳ '${itemSemester}' không hợp lệ. Chỉ chấp nhận: ${SUPPORTED_SEMESTERS.join(", ")}`,
        400
      );
    }

    const validatedValue = validateGradeValue(item.value);
    const resolvedWeight = resolveGradeWeight(itemGradeType, item.weight);

    let recordDoc = null;
    if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
      recordDoc = await GradeRecord.findOne({
        _id: item._id,
        teachingAssignment: taDoc._id,
        isDeleted: false,
      });
    }

    if (!recordDoc) {
      recordDoc = await GradeRecord.findOne({
        student: itemStudentId,
        teachingAssignment: taDoc._id,
        semester: itemSemester,
        gradeType: itemGradeType,
        isDeleted: false,
      });
    }

    if (recordDoc) {
      recordDoc.value = validatedValue;
      recordDoc.weight = resolvedWeight;
      if (item.note !== undefined) {
        recordDoc.note = String(item.note).trim();
      }
      if (actorId) {
        recordDoc.updatedBy = actorId;
      }
      const updated = await recordDoc.save();
      savedRecords.push(updated);
    } else {
      const created = new GradeRecord({
        student: itemStudentId,
        teachingAssignment: taDoc._id,
        semester: itemSemester,
        gradeType: itemGradeType,
        value: validatedValue,
        weight: resolvedWeight,
        note: item.note ? String(item.note).trim() : "",
        createdBy: actorId,
        updatedBy: actorId,
      });
      const saved = await created.save();
      savedRecords.push(saved);
    }
  }

  return {
    records: savedRecords,
    count: savedRecords.length,
  };
};

/**
 * Truy vấn danh sách điểm và tính điểm trung bình theo học sinh / lớp / môn / học kỳ
 */
const getGradeRecords = async (query = {}, context = {}) => {
  const { user, targetTeachingAssignment } = context;
  const {
    student,
    studentId,
    teachingAssignment,
    classId,
    class: classParam,
    subjectId,
    subject: subjectParam,
    semester,
    academicYear,
    gradeType,
  } = query;

  const filter = { isDeleted: false };

  const targetStudentId = student || studentId;
  const targetClassId = classId || classParam;
  const targetSubjectId = subjectId || subjectParam;

  // 1. Phân quyền Học sinh: chỉ được xem điểm của chính mình
  if (user?.role === "student") {
    const currentUserId = (user.userId || user._id || user.id)?.toString();
    if (targetStudentId && targetStudentId.toString() !== currentUserId) {
      throw createAppError(
        "Học sinh chỉ có quyền xem điểm số của chính mình!",
        403
      );
    }
    filter.student = currentUserId;
  } else if (targetStudentId) {
    if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
      throw createAppError("Mã học sinh (student) không hợp lệ", 400);
    }
    filter.student = targetStudentId;
  }

  // 2. Lọc theo học kỳ & loại điểm
  if (semester) {
    const normalizedSemester = String(semester).trim();
    if (!SUPPORTED_SEMESTERS.includes(normalizedSemester)) {
      throw createAppError(
        `Học kỳ '${semester}' không hợp lệ. Chỉ chấp nhận: ${SUPPORTED_SEMESTERS.join(", ")}`,
        400
      );
    }
    filter.semester = normalizedSemester;
  }

  if (gradeType) {
    const normalizedType = String(gradeType).toLowerCase().trim();
    if (!SUPPORTED_GRADE_TYPES.includes(normalizedType)) {
      throw createAppError(`Loại điểm '${gradeType}' không hợp lệ`, 400);
    }
    filter.gradeType = normalizedType;
  }

  // 3. Lọc theo TeachingAssignment hoặc Lớp / Môn / Năm học
  if (teachingAssignment) {
    if (!mongoose.Types.ObjectId.isValid(teachingAssignment)) {
      throw createAppError(
        "Mã phân công giảng dạy (teachingAssignment) không hợp lệ",
        400
      );
    }

    let taDoc = targetTeachingAssignment;
    if (!taDoc) {
      taDoc = await TeachingAssignment.findOne({
        _id: teachingAssignment,
        isDeleted: false,
      });
    }

    if (!taDoc) {
      throw createAppError(
        "Phân công giảng dạy không tồn tại hoặc đã bị xóa",
        404
      );
    }

    if (user?.role === "teacher") {
      const assignedTeacherId = (taDoc.teacher?._id || taDoc.teacher)?.toString();
      const currentUserId = (user.userId || user._id || user.id)?.toString();
      if (assignedTeacherId !== currentUserId) {
        // Kiểm tra xem có phải GVCN của lớp đó không
        const cls = await Class.findOne({
          _id: taDoc.class?._id || taDoc.class,
          isDeleted: false,
        });
        const homeroomId = (
          cls?.homeroomTeacher?._id || cls?.homeroomTeacher
        )?.toString();
        if (!homeroomId || homeroomId !== currentUserId) {
          throw createAppError(
            "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập sổ điểm!",
            403
          );
        }
      }
    }

    filter.teachingAssignment = taDoc._id;
  } else if (targetClassId || targetSubjectId || academicYear || user?.role === "teacher") {
    const taQuery = { isDeleted: false };

    if (targetClassId) {
      if (!mongoose.Types.ObjectId.isValid(targetClassId)) {
        throw createAppError("Mã lớp học (classId) không hợp lệ", 400);
      }
      taQuery.class = targetClassId;
    }

    if (targetSubjectId) {
      if (!mongoose.Types.ObjectId.isValid(targetSubjectId)) {
        throw createAppError("Mã môn học (subjectId) không hợp lệ", 400);
      }
      taQuery.subject = targetSubjectId;
    }

    if (academicYear) {
      taQuery.academicYear = String(academicYear).trim();
    }

    if (user?.role === "teacher") {
      const currentUserId = (user.userId || user._id || user.id)?.toString();
      const homeroomClasses = await Class.find({
        homeroomTeacher: currentUserId,
        isDeleted: false,
      }).select("_id");
      const homeroomClassIds = homeroomClasses.map((c) => c._id);

      taQuery.$or = [
        { teacher: currentUserId },
        ...(homeroomClassIds.length > 0
          ? [{ class: { $in: homeroomClassIds } }]
          : []),
      ];
    }

    const matchedAssignments = await TeachingAssignment.find(taQuery).select("_id");

    if (
      user?.role === "teacher" &&
      (targetClassId || targetSubjectId) &&
      matchedAssignments.length === 0
    ) {
      // Kiểm tra xem lớp/môn đó có phân công cho GV khác hay không để trả 403 đúng chuẩn
      const rawCheckQuery = { isDeleted: false };
      if (targetClassId) rawCheckQuery.class = targetClassId;
      if (targetSubjectId) rawCheckQuery.subject = targetSubjectId;
      const existingOtherTa = await TeachingAssignment.findOne(rawCheckQuery);
      if (existingOtherTa) {
        throw createAppError(
          "Bạn không được phân công giảng dạy lớp/môn học này, không có quyền truy cập sổ điểm!",
          403
        );
      }
    }

    filter.teachingAssignment = {
      $in: matchedAssignments.map((a) => a._id),
    };
  }

  const records = await GradeRecord.find(filter)
    .sort({ semester: 1, gradeType: 1, createdAt: 1 })
    .populate("student", "fullName userCode email className classRef")
    .populate({
      path: "teachingAssignment",
      select: "class subject teacher academicYear semester",
      populate: [
        { path: "class", select: "name academicYear" },
        { path: "subject", select: "name code" },
        { path: "teacher", select: "fullName userCode email" },
      ],
    })
    .lean();

  // Tính điểm trung bình tổng của tập kết quả
  const average = calculateWeightedAverage(records);

  // Nhóm và tính điểm trung bình theo từng (Học sinh - Phân công môn học - Học kỳ)
  const groupedMap = new Map();
  for (const rec of records) {
    const sId = (rec.student?._id || rec.student)?.toString() || "unknown";
    const taId =
      (rec.teachingAssignment?._id || rec.teachingAssignment)?.toString() ||
      "unknown";
    const sem = rec.semester || "HK1";
    const groupKey = `${sId}_${taId}_${sem}`;

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        student: rec.student,
        teachingAssignment: rec.teachingAssignment,
        semester: sem,
        records: [],
      });
    }
    groupedMap.get(groupKey).records.push(rec);
  }

  const summaries = Array.from(groupedMap.values()).map((group) => {
    const avg = calculateWeightedAverage(group.records);
    return {
      student: group.student,
      teachingAssignment: group.teachingAssignment,
      semester: group.semester,
      recordCount: group.records.length,
      average: avg,
      academicPerformance: classifyAcademicPerformance(avg),
      records: group.records,
    };
  });

  return {
    records,
    average,
    academicPerformance: classifyAcademicPerformance(average),
    weightConfig: getGradeWeightConfig(),
    summaries,
  };
};

module.exports = {
  DEFAULT_GRADE_WEIGHTS,
  SUPPORTED_GRADE_TYPES,
  SUPPORTED_SEMESTERS,
  createAppError,
  getGradeWeightConfig,
  setGradeWeightConfig,
  resetGradeWeightConfig,
  resolveGradeWeight,
  validateGradeValue,
  calculateWeightedAverage,
  calculateSubjectGPA,
  calculateOverallGPA,
  classifyAcademicPerformance,
  createGradeRecord,
  updateGradeRecord,
  deleteGradeRecord,
  bulkUpsertGradeRecords,
  getGradeRecords,
};
