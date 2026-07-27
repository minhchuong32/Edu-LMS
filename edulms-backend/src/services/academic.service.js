const Grade = require("../models/Grade");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");
const TeachingAssignment = require("../models/TeachingAssignment");
const GradeRecord = require("../models/GradeRecord");
const ApiError = require("../utils/ApiError");

// Grade Services
const createGrade = async (gradeData) => {
  const { name } = gradeData;
  if (!name) {
    throw new ApiError(400, "Tên khối là bắt buộc.");
  }
  if (!["10", "11", "12"].includes(name)) {
    throw new ApiError(400, "Tên khối phải thuộc danh sách: 10, 11, 12.");
  }

  const existingGrade = await Grade.findOne({ name });
  if (existingGrade) {
    throw new ApiError(400, `Khối ${name} đã tồn tại.`);
  }

  return await Grade.create({ name });
};

const getGrades = async () => {
  return await Grade.find().sort({ name: 1 });
};

const getGradeById = async (id) => {
  const grade = await Grade.findById(id);
  if (!grade) {
    throw new ApiError(404, "Không tìm thấy khối học này.");
  }
  return grade;
};

const updateGrade = async (id, gradeData) => {
  const { name } = gradeData;
  if (!name) {
    throw new ApiError(400, "Tên khối là bắt buộc.");
  }
  if (!["10", "11", "12"].includes(name)) {
    throw new ApiError(400, "Tên khối phải thuộc danh sách: 10, 11, 12.");
  }

  const grade = await Grade.findById(id);
  if (!grade) {
    throw new ApiError(404, "Không tìm thấy khối học này.");
  }

  const existingGrade = await Grade.findOne({ name, _id: { $ne: id } });
  if (existingGrade) {
    throw new ApiError(400, `Khối ${name} đã tồn tại.`);
  }

  grade.name = name;
  return await grade.save();
};

const deleteGrade = async (id) => {
  const grade = await Grade.findById(id);
  if (!grade) {
    throw new ApiError(404, "Không tìm thấy khối học này.");
  }

  // Check if any class is associated with this grade
  const classesUsingGrade = await Class.exists({ gradeRef: id });
  if (classesUsingGrade) {
    throw new ApiError(400, "Không thể xóa khối học vì đang có lớp học thuộc khối này.");
  }

  await Grade.findByIdAndDelete(id);
  return { id };
};

// Class Services
const createClass = async (classData) => {
  const name = classData.name;
  const gradeRef = classData.gradeRef || classData.grade;
  const homeroomTeacherRef = classData.homeroomTeacherRef || classData.homeroomTeacher;
  const schoolYear = classData.schoolYear;

  if (!name || !gradeRef || !homeroomTeacherRef || !schoolYear) {
    throw new ApiError(400, "Vui lòng cung cấp đầy đủ thông tin: tên lớp, khối, giáo viên chủ nhiệm, năm học.");
  }

  // Validate gradeRef exists
  const gradeExists = await Grade.findById(gradeRef);
  if (!gradeExists) {
    throw new ApiError(404, "Không tìm thấy khối học được liên kết.");
  }

  // Validate teacher exists and has teacher role
  const teacher = await User.findById(homeroomTeacherRef);
  if (!teacher) {
    throw new ApiError(404, "Không tìm thấy giáo viên được liên kết.");
  }
  if (teacher.role !== "teacher") {
    throw new ApiError(400, "Người dùng được chọn làm giáo viên chủ nhiệm phải có vai trò là giáo viên.");
  }

  // Validate class name uniqueness in the same school year
  const nameExists = await Class.findOne({ name, schoolYear });
  if (nameExists) {
    throw new ApiError(400, `Lớp học ${name} đã tồn tại trong năm học ${schoolYear}.`);
  }

  // Validate teacher is not already a homeroom teacher in the same school year
  const teacherAssigned = await Class.findOne({ homeroomTeacherRef, schoolYear });
  if (teacherAssigned) {
    throw new ApiError(400, `Giáo viên ${teacher.name} đã chủ nhiệm lớp ${teacherAssigned.name} trong năm học ${schoolYear}.`);
  }

  return await Class.create({ name, gradeRef, homeroomTeacherRef, schoolYear });
};

const getClasses = async (filters = {}) => {
  const gradeRef = filters.gradeRef || filters.grade;
  const schoolYear = filters.schoolYear;
  const search = filters.search;
  const query = {};

  if (gradeRef) {
    query.gradeRef = gradeRef;
  }
  if (schoolYear) {
    query.schoolYear = schoolYear;
  }
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  return await Class.find(query)
    .populate("gradeRef")
    .populate("homeroomTeacherRef", "name email teacherCode role")
    .sort({ schoolYear: -1, name: 1 });
};

const getClassById = async (id) => {
  const classObj = await Class.findById(id)
    .populate("gradeRef")
    .populate("homeroomTeacherRef", "name email teacherCode role");
  if (!classObj) {
    throw new ApiError(404, "Không tìm thấy lớp học này.");
  }
  return classObj;
};

const updateClass = async (id, classData) => {
  const name = classData.name;
  const gradeRef = classData.gradeRef || classData.grade;
  const homeroomTeacherRef = classData.homeroomTeacherRef || classData.homeroomTeacher;
  const schoolYear = classData.schoolYear;

  const classObj = await Class.findById(id);
  if (!classObj) {
    throw new ApiError(404, "Không tìm thấy lớp học này.");
  }

  // Fields to update
  if (gradeRef) {
    const gradeExists = await Grade.findById(gradeRef);
    if (!gradeExists) {
      throw new ApiError(404, "Không tìm thấy khối học được liên kết.");
    }
    classObj.gradeRef = gradeRef;
  }

  if (schoolYear) {
    classObj.schoolYear = schoolYear;
  }

  if (name) {
    classObj.name = name;
  }

  // Check class name uniqueness in the same school year if name or schoolYear changes
  const targetName = name || classObj.name;
  const targetYear = schoolYear || classObj.schoolYear;
  const nameExists = await Class.findOne({
    name: targetName,
    schoolYear: targetYear,
    _id: { $ne: id }
  });
  if (nameExists) {
    throw new ApiError(400, `Lớp học ${targetName} đã tồn tại trong năm học ${targetYear}.`);
  }

  if (homeroomTeacherRef) {
    const teacher = await User.findById(homeroomTeacherRef);
    if (!teacher) {
      throw new ApiError(404, "Không tìm thấy giáo viên được liên kết.");
    }
    if (teacher.role !== "teacher") {
      throw new ApiError(400, "Người dùng được chọn làm giáo viên chủ nhiệm phải có vai trò là giáo viên.");
    }

    // Check teacher assignment in the same school year
    const teacherAssigned = await Class.findOne({
      homeroomTeacherRef,
      schoolYear: targetYear,
      _id: { $ne: id }
    });
    if (teacherAssigned) {
      throw new ApiError(400, `Giáo viên ${teacher.name} đã chủ nhiệm lớp ${teacherAssigned.name} trong năm học ${targetYear}.`);
    }
    classObj.homeroomTeacherRef = homeroomTeacherRef;
  }

  return await classObj.save();
};

const deleteClass = async (id) => {
  const classObj = await Class.findById(id);
  if (!classObj) {
    throw new ApiError(404, "Không tìm thấy lớp học này.");
  }

  // Check active students
  const studentsInClass = await User.exists({ classRef: id });
  if (studentsInClass) {
    throw new ApiError(400, "Không thể xóa lớp học vì đang có học sinh thuộc lớp này.");
  }

  // Check teaching assignments
  const assignmentsUsingClass = await TeachingAssignment.exists({ classRef: id });
  if (assignmentsUsingClass) {
    throw new ApiError(400, "Không thể xóa lớp học vì đang có phân công giảng dạy được gán cho lớp này.");
  }

  // Check grade records
  const gradeRecordsUsingClass = await GradeRecord.exists({ classRef: id });
  if (gradeRecordsUsingClass) {
    throw new ApiError(400, "Không thể xóa lớp học vì đã có bản ghi điểm số liên kết với lớp này.");
  }

  await Class.findByIdAndDelete(id);
  return { id };
};

// Subject Services
const createSubject = async (subjectData) => {
  const { name, description } = subjectData;
  if (!name) {
    throw new ApiError(400, "Tên môn học là bắt buộc.");
  }

  const existingSubject = await Subject.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
  if (existingSubject) {
    throw new ApiError(400, `Môn học ${name} đã tồn tại.`);
  }

  return await Subject.create({ name, description });
};

const getSubjects = async (filters = {}) => {
  const { search } = filters;
  const query = {};
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  return await Subject.find(query).sort({ name: 1 });
};

const getSubjectById = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(404, "Không tìm thấy môn học này.");
  }
  return subject;
};

const updateSubject = async (id, subjectData) => {
  const { name, description } = subjectData;

  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(404, "Không tìm thấy môn học này.");
  }

  if (name) {
    const existingSubject = await Subject.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      _id: { $ne: id }
    });
    if (existingSubject) {
      throw new ApiError(400, `Môn học ${name} đã tồn tại.`);
    }
    subject.name = name;
  }

  if (description !== undefined) {
    subject.description = description;
  }

  return await subject.save();
};

const deleteSubject = async (id) => {
  const subject = await Subject.findById(id);
  if (!subject) {
    throw new ApiError(404, "Không tìm thấy môn học này.");
  }

  // Check teaching assignments
  const assignmentsUsingSubject = await TeachingAssignment.exists({ subjectRef: id });
  if (assignmentsUsingSubject) {
    throw new ApiError(400, "Không thể xóa môn học vì đang có phân công giảng dạy được liên kết.");
  }

  // Check grade records
  const gradeRecordsUsingSubject = await GradeRecord.exists({ subjectRef: id });
  if (gradeRecordsUsingSubject) {
    throw new ApiError(400, "Không thể xóa môn học vì đã có bản ghi điểm số liên kết.");
  }

  await Subject.findByIdAndDelete(id);
  return { id };
};

// TeachingAssignment Services
const createTeachingAssignment = async (assignmentData) => {
  const teacherRef = assignmentData.teacherRef || assignmentData.teacher;
  const classRef = assignmentData.classRef || assignmentData.class;
  const subjectRef = assignmentData.subjectRef || assignmentData.subject;

  if (!teacherRef || !classRef || !subjectRef) {
    throw new ApiError(400, "Vui lòng cung cấp đầy đủ thông tin: giáo viên, lớp học, môn học.");
  }

  // Validate teacher exists and is indeed a teacher
  const teacher = await User.findById(teacherRef);
  if (!teacher) {
    throw new ApiError(404, "Không tìm thấy giáo viên được liên kết.");
  }
  if (teacher.role !== "teacher") {
    throw new ApiError(400, "Người dùng được phân công phải có vai trò là giáo viên.");
  }

  // Validate class exists
  const classExists = await Class.findById(classRef);
  if (!classExists) {
    throw new ApiError(404, "Không tìm thấy lớp học được liên kết.");
  }

  // Validate subject exists
  const subjectExists = await Subject.findById(subjectRef);
  if (!subjectExists) {
    throw new ApiError(404, "Không tìm thấy môn học được liên kết.");
  }

  // Validate unique assignment of the same subject to the same class
  const existingAssignment = await TeachingAssignment.findOne({ classRef, subjectRef });
  if (existingAssignment) {
    throw new ApiError(400, "Môn học này đã được phân công cho giáo viên khác trong lớp này.");
  }

  return await TeachingAssignment.create({ teacherRef, classRef, subjectRef });
};

const getTeachingAssignments = async (filters = {}) => {
  const teacherRef = filters.teacherRef || filters.teacher;
  const classRef = filters.classRef || filters.class;
  const subjectRef = filters.subjectRef || filters.subject;

  const query = {};
  if (teacherRef) query.teacherRef = teacherRef;
  if (classRef) query.classRef = classRef;
  if (subjectRef) query.subjectRef = subjectRef;

  return await TeachingAssignment.find(query)
    .populate("teacherRef", "name email teacherCode role")
    .populate({
      path: "classRef",
      populate: {
        path: "gradeRef",
      },
    })
    .populate("subjectRef")
    .sort({ createdAt: -1 });
};

const getTeachingAssignmentById = async (id) => {
  const assignment = await TeachingAssignment.findById(id)
    .populate("teacherRef", "name email teacherCode role")
    .populate({
      path: "classRef",
      populate: {
        path: "gradeRef",
      },
    })
    .populate("subjectRef");

  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy này.");
  }
  return assignment;
};

const updateTeachingAssignment = async (id, assignmentData) => {
  const teacherRef = assignmentData.teacherRef || assignmentData.teacher;
  const classRef = assignmentData.classRef || assignmentData.class;
  const subjectRef = assignmentData.subjectRef || assignmentData.subject;

  const assignment = await TeachingAssignment.findById(id);
  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy này.");
  }

  if (teacherRef) {
    const teacher = await User.findById(teacherRef);
    if (!teacher) {
      throw new ApiError(404, "Không tìm thấy giáo viên được liên kết.");
    }
    if (teacher.role !== "teacher") {
      throw new ApiError(400, "Người dùng được phân công phải có vai trò là giáo viên.");
    }
    assignment.teacherRef = teacherRef;
  }

  if (classRef) {
    const classExists = await Class.findById(classRef);
    if (!classExists) {
      throw new ApiError(404, "Không tìm thấy lớp học được liên kết.");
    }
    assignment.classRef = classRef;
  }

  if (subjectRef) {
    const subjectExists = await Subject.findById(subjectRef);
    if (!subjectExists) {
      throw new ApiError(404, "Không tìm thấy môn học được liên kết.");
    }
    assignment.subjectRef = subjectRef;
  }

  // Validate uniqueness for the new class/subject combination
  if (classRef || subjectRef) {
    const targetClass = classRef || assignment.classRef;
    const targetSubject = subjectRef || assignment.subjectRef;

    const existingAssignment = await TeachingAssignment.findOne({
      classRef: targetClass,
      subjectRef: targetSubject,
      _id: { $ne: id }
    });
    if (existingAssignment) {
      throw new ApiError(400, "Môn học này đã được phân công cho giáo viên khác trong lớp này.");
    }
  }

  const saved = await assignment.save();
  return await saved.populate([
    { path: "teacherRef", select: "name email teacherCode role" },
    { path: "classRef", populate: { path: "gradeRef" } },
    { path: "subjectRef" }
  ]);
};

const deleteTeachingAssignment = async (id) => {
  const assignment = await TeachingAssignment.findById(id);
  if (!assignment) {
    throw new ApiError(404, "Không tìm thấy phân công giảng dạy này.");
  }

  // Check if any Assignment is linked to this TeachingAssignment
  const Assignment = require("../models/Assignment");
  const assignmentLinked = await Assignment.exists({ teachingAssignmentRef: id });
  if (assignmentLinked) {
    throw new ApiError(400, "Không thể xóa phân công giảng dạy này vì đang có bài tập lớp học được liên kết.");
  }

  // Check if any Exam is linked to this TeachingAssignment
  const Exam = require("../models/Exam");
  const examLinked = await Exam.exists({ teachingAssignmentRef: id });
  if (examLinked) {
    throw new ApiError(400, "Không thể xóa phân công giảng dạy này vì đang có đề thi được liên kết.");
  }

  await TeachingAssignment.findByIdAndDelete(id);
  return { id };
};

module.exports = {
  createGrade,
  getGrades,
  getGradeById,
  updateGrade,
  deleteGrade,
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  createTeachingAssignment,
  getTeachingAssignments,
  getTeachingAssignmentById,
  updateTeachingAssignment,
  deleteTeachingAssignment,
};
