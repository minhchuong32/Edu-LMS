const Subject = require("../models/Subject");
const TeachingAssignment = require("../models/TeachingAssignment");

const DEFAULT_SUBJECTS = [
  { name: "Toán học", code: "TOAN", periodsPerWeek: 4, description: "Môn Toán THPT" },
  { name: "Ngữ văn", code: "VAN", periodsPerWeek: 4, description: "Môn Ngữ Văn THPT" },
  { name: "Tiếng Anh", code: "ENG", periodsPerWeek: 3, description: "Môn Tiếng Anh THPT" },
  { name: "Vật lí", code: "LY", periodsPerWeek: 2, description: "Môn Vật lí THPT" },
  { name: "Hóa học", code: "HOA", periodsPerWeek: 2, description: "Môn Hóa học THPT" },
  { name: "Sinh học", code: "SINH", periodsPerWeek: 2, description: "Môn Sinh học THPT" },
  { name: "Lịch sử", code: "SU", periodsPerWeek: 2, description: "Môn Lịch sử THPT" },
  { name: "Địa lí", code: "DIA", periodsPerWeek: 2, description: "Môn Địa lí THPT" },
  { name: "Tin học", code: "TIN", periodsPerWeek: 2, description: "Môn Tin học THPT" },
  { name: "Giáo dục kinh tế và pháp luật", code: "KTPL", periodsPerWeek: 2, description: "Môn GDKT & PL THPT" },
  { name: "Giáo dục thể chất", code: "GDTC", periodsPerWeek: 2, description: "Môn Thể dục THPT" },
  { name: "Công nghệ", code: "CN", periodsPerWeek: 2, description: "Môn Công nghệ THPT" },
];

/**
 * Khởi tạo danh mục môn học chuẩn THPT nếu chưa có
 */
const ensureDefaultSubjects = async () => {
  const count = await Subject.countDocuments();
  if (count === 0) {
    for (const sub of DEFAULT_SUBJECTS) {
      await Subject.create({
        ...sub,
        isActive: true,
        isDeleted: false,
      });
    }
  }
};

/**
 * Lấy danh sách môn học (hỗ trợ tìm kiếm, lọc theo khối, trạng thái)
 */
const getSubjects = async (query = {}) => {
  await ensureDefaultSubjects();

  const filter = { isDeleted: false };

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  if (query.gradeLevel) {
    const level = Number(query.gradeLevel);
    filter.$or = [{ gradeLevel: level }, { gradeLevel: null }];
  }

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), "i");
    filter.$or = [{ name: searchRegex }, { code: searchRegex }];
  }

  const subjects = await Subject.find(filter).sort({ name: 1 }).lean();

  // Đính kèm số lượng phân công giảng dạy cho từng môn
  const subjectsWithStats = await Promise.all(
    subjects.map(async (subj) => {
      const assignmentCount = await TeachingAssignment.countDocuments({
        subject: subj._id,
        isDeleted: false,
      });
      return {
        ...subj,
        assignmentCount,
      };
    })
  );

  return subjectsWithStats;
};

/**
 * Lấy chi tiết môn học theo ID
 */
const getSubjectById = async (id) => {
  const subject = await Subject.findOne({ _id: id, isDeleted: false }).lean();
  if (!subject) {
    const error = new Error("Môn học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }
  const assignmentCount = await TeachingAssignment.countDocuments({
    subject: subject._id,
    isDeleted: false,
  });
  return { ...subject, assignmentCount };
};

/**
 * Tạo mới môn học
 */
const createSubject = async ({ name, code, gradeLevel, periodsPerWeek, description, isActive = true }) => {
  if (!name || !name.trim()) {
    const error = new Error("Tên môn học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }
  if (!code || !code.trim()) {
    const error = new Error("Mã môn học là bắt buộc!");
    error.statusCode = 400;
    throw error;
  }

  const cleanCode = code.trim().toUpperCase();

  const existing = await Subject.findOne({ code: cleanCode });
  if (existing) {
    if (existing.isDeleted) {
      existing.isDeleted = false;
      existing.isActive = isActive;
      existing.name = name.trim();
      existing.gradeLevel = gradeLevel || null;
      if (periodsPerWeek) existing.periodsPerWeek = Number(periodsPerWeek);
      if (description) existing.description = description.trim();
      await existing.save();
      return existing;
    }
    const error = new Error(`Môn học với mã '${cleanCode}' đã tồn tại!`);
    error.statusCode = 400;
    throw error;
  }

  const newSubject = await Subject.create({
    name: name.trim(),
    code: cleanCode,
    gradeLevel: gradeLevel ? Number(gradeLevel) : null,
    periodsPerWeek: periodsPerWeek ? Number(periodsPerWeek) : 2,
    description: description ? description.trim() : "",
    isActive,
    isDeleted: false,
  });

  return newSubject;
};

/**
 * Cập nhật thông tin môn học
 */
const updateSubject = async (id, data) => {
  const subject = await Subject.findOne({ _id: id, isDeleted: false });
  if (!subject) {
    const error = new Error("Môn học không tồn tại!");
    error.statusCode = 404;
    throw error;
  }

  if (data.code && data.code.trim().toUpperCase() !== subject.code) {
    const newCode = data.code.trim().toUpperCase();
    const duplicate = await Subject.findOne({
      code: newCode,
      _id: { $ne: id },
      isDeleted: false,
    });
    if (duplicate) {
      const error = new Error(`Mã môn '${newCode}' đã được sử dụng bởi môn học khác!`);
      error.statusCode = 400;
      throw error;
    }
    subject.code = newCode;
  }

  if (data.name !== undefined) subject.name = data.name.trim();
  if (data.gradeLevel !== undefined) subject.gradeLevel = data.gradeLevel ? Number(data.gradeLevel) : null;
  if (data.periodsPerWeek !== undefined) subject.periodsPerWeek = Number(data.periodsPerWeek);
  if (data.description !== undefined) subject.description = data.description.trim();
  if (data.isActive !== undefined) subject.isActive = Boolean(data.isActive);

  await subject.save();
  return subject;
};

/**
 * Xóa môn học (kiểm tra phân công liên quan, nếu có thì soft-delete hoặc chặn xóa cứng)
 */
const deleteSubject = async (id) => {
  const subject = await Subject.findOne({ _id: id, isDeleted: false });
  if (!subject) {
    const error = new Error("Môn học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  const activeAssignments = await TeachingAssignment.countDocuments({
    subject: subject._id,
    isDeleted: false,
  });

  // Áp dụng soft-delete đối với môn học đang có dữ liệu phân công liên quan
  subject.isDeleted = true;
  subject.isActive = false;
  await subject.save();

  return {
    message: activeAssignments > 0
      ? `Môn học '${subject.name}' có ${activeAssignments} phân công liên quan, hệ thống đã chuyển sang trạng thái ngưng hoạt động (soft-delete).`
      : `Đã xóa thành công môn học '${subject.name}'.`,
    hasRelatedData: activeAssignments > 0,
  };
};

module.exports = {
  ensureDefaultSubjects,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
