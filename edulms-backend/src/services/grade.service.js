const Grade = require("../models/Grade");
const Class = require("../models/Class");

/**
 * Tự động khởi tạo 3 khối chuẩn 10, 11, 12 nếu cơ sở dữ liệu chưa có
 */
const ensureDefaultGrades = async () => {
  const defaultLevels = [10, 11, 12];
  for (const level of defaultLevels) {
    const existing = await Grade.findOne({ level });
    if (!existing) {
      await Grade.create({
        level,
        name: `Khối ${level}`,
        description: `Chương trình giáo dục THPT Khối ${level}`,
        isActive: true,
        isDeleted: false,
      });
    }
  }
};

/**
 * Lấy danh sách toàn bộ các khối (kèm thống kê số lớp tương ứng)
 */
const getGrades = async (query = {}) => {
  await ensureDefaultGrades();

  const filter = { isDeleted: false };
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true" || query.isActive === true;
  }

  const grades = await Grade.find(filter).sort({ level: 1 }).lean();

  // Đếm số lớp cho mỗi khối
  const gradesWithStats = await Promise.all(
    grades.map(async (grade) => {
      const classCount = await Class.countDocuments({
        grade: grade._id,
        isDeleted: false,
      });
      return {
        ...grade,
        classCount,
      };
    })
  );

  return gradesWithStats;
};

/**
 * Lấy chi tiết một khối theo ID
 */
const getGradeById = async (id) => {
  const grade = await Grade.findOne({ _id: id, isDeleted: false }).lean();
  if (!grade) {
    const error = new Error("Khối học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }
  const classCount = await Class.countDocuments({
    grade: grade._id,
    isDeleted: false,
  });
  return { ...grade, classCount };
};

/**
 * Tạo mới một khối học
 */
const createGrade = async ({ level, name, description, isActive = true }) => {
  const parsedLevel = Number(level);
  if (![10, 11, 12].includes(parsedLevel)) {
    const error = new Error("Khối học chỉ được phép thuộc các khối 10, 11 hoặc 12!");
    error.statusCode = 400;
    throw error;
  }

  const existingGrade = await Grade.findOne({ level: parsedLevel });
  if (existingGrade) {
    if (existingGrade.isDeleted) {
      existingGrade.isDeleted = false;
      existingGrade.isActive = isActive;
      if (name) existingGrade.name = name;
      if (description) existingGrade.description = description;
      await existingGrade.save();
      return existingGrade;
    }
    const error = new Error(`Khối ${parsedLevel} đã tồn tại trong hệ thống!`);
    error.statusCode = 400;
    throw error;
  }

  const newGrade = await Grade.create({
    level: parsedLevel,
    name: name || `Khối ${parsedLevel}`,
    description: description || `Chương trình giáo dục THPT Khối ${parsedLevel}`,
    isActive,
    isDeleted: false,
  });

  return newGrade;
};

/**
 * Cập nhật thông tin khối học
 */
const updateGrade = async (id, data) => {
  const grade = await Grade.findOne({ _id: id, isDeleted: false });
  if (!grade) {
    const error = new Error("Khối học không tồn tại!");
    error.statusCode = 404;
    throw error;
  }

  if (data.name !== undefined) grade.name = data.name.trim();
  if (data.description !== undefined) grade.description = data.description.trim();
  if (data.isActive !== undefined) grade.isActive = Boolean(data.isActive);

  await grade.save();
  return grade;
};

/**
 * Xóa khối học (kiểm tra ràng buộc dữ liệu liên quan và thực hiện soft-delete)
 */
const deleteGrade = async (id) => {
  const grade = await Grade.findOne({ _id: id, isDeleted: false });
  if (!grade) {
    const error = new Error("Khối học không tồn tại hoặc đã bị xóa!");
    error.statusCode = 404;
    throw error;
  }

  // Kiểm tra xem có lớp nào đang trực thuộc khối này không
  const activeClassCount = await Class.countDocuments({
    grade: grade._id,
    isDeleted: false,
  });

  if (activeClassCount > 0) {
    const error = new Error(
      `Không thể xóa Khối ${grade.level} vì đang có ${activeClassCount} lớp học trực thuộc! Vui lòng chuyển hoặc xóa các lớp trước.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Áp dụng Soft Delete theo Acceptance Criteria
  grade.isDeleted = true;
  grade.isActive = false;
  await grade.save();

  return { message: `Đã xóa thành công Khối ${grade.level}` };
};

module.exports = {
  ensureDefaultGrades,
  getGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
};
