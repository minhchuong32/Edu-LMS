const mongoose = require("mongoose");
const User = require("../models/User");
const Class = require("../models/Class");
const GradeRecord = require("../models/GradeRecord");
const {
  calculateWeightedAverage,
  calculateOverallGPA,
  classifyAcademicPerformance,
} = require("../services/gradebook.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * Helper tổng hợp bảng điểm và thông tin điểm danh/chuyên cần của một học sinh cụ thể
 */
const buildChildAcademicAndAttendanceSummary = async (
  studentDoc,
  queryOptions = {}
) => {
  const studentId = studentDoc._id.toString();
  const { semester } = queryOptions;

  // 1. Lấy thông tin Lớp học & Giáo viên chủ nhiệm (GVCN)
  let classDoc = null;
  if (studentDoc.classRef) {
    const clsQuery = Class.findOne({
      _id: studentDoc.classRef,
      isDeleted: false,
    });
    classDoc =
      clsQuery && typeof clsQuery.populate === "function"
        ? await clsQuery
            .populate("homeroomTeacher", "fullName email userCode")
            .lean()
        : await clsQuery;
  } else if (studentDoc.className) {
    const clsQuery = Class.findOne({
      name: studentDoc.className,
      isDeleted: false,
    });
    classDoc =
      clsQuery && typeof clsQuery.populate === "function"
        ? await clsQuery
            .populate("homeroomTeacher", "fullName email userCode")
            .lean()
        : await clsQuery;
  }

  // 2. Truy vấn bảng điểm (GradeRecord) của học sinh
  const gradeFilter = {
    student: studentDoc._id,
    isDeleted: false,
  };
  if (semester && ["HK1", "HK2", "CaNam"].includes(String(semester).trim())) {
    gradeFilter.semester = String(semester).trim();
  }

  const gradeQuery = GradeRecord.find(gradeFilter);
  const gradeRecords =
    gradeQuery && typeof gradeQuery.populate === "function"
      ? await gradeQuery
          .sort({ semester: 1, gradeType: 1, createdAt: 1 })
          .populate({
            path: "teachingAssignment",
            select: "class subject teacher academicYear semester",
            populate: [
              { path: "class", select: "name academicYear" },
              { path: "subject", select: "name code" },
              { path: "teacher", select: "fullName email" },
            ],
          })
          .lean()
      : Array.isArray(gradeQuery)
        ? gradeQuery
        : [];

  // Gom nhóm điểm theo từng môn học
  const subjectMap = new Map();
  gradeRecords.forEach((rec) => {
    const subObj = rec.teachingAssignment?.subject || {};
    const subId = (
      subObj._id ||
      rec.teachingAssignment?.subject ||
      rec.teachingAssignment?._id ||
      "general"
    ).toString();
    const subName = subObj.name || "Môn học";
    const subCode = subObj.code || "---";

    if (!subjectMap.has(subId)) {
      subjectMap.set(subId, {
        subjectId: subId,
        subjectName: subName,
        subjectCode: subCode,
        teacherName:
          rec.teachingAssignment?.teacher?.fullName || "Giáo viên bộ môn",
        records: [],
      });
    }
    subjectMap.get(subId).records.push({
      _id: rec._id?.toString(),
      semester: rec.semester || "HK1",
      gradeType: rec.gradeType,
      value: rec.value,
      weight: rec.weight,
      note: rec.note || "",
    });
  });

  const subjects = [];
  subjectMap.forEach((group) => {
    const avg = calculateWeightedAverage(group.records);
    subjects.push({
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      subjectCode: group.subjectCode,
      teacherName: group.teacherName,
      average: avg,
      academicPerformance: classifyAcademicPerformance(avg),
      recordCount: group.records.length,
      records: group.records,
    });
  });

  const validSubjects = subjects.filter((s) => typeof s.average === "number");
  const currentGPA = calculateOverallGPA(
    validSubjects.map((s) => ({
      subjectName: s.subjectName,
      gpa: s.average,
      weight: 1,
    }))
  );
  const academicPerformance = classifyAcademicPerformance(currentGPA);

  // 3. Tổng hợp thông tin điểm danh / chuyên cần của học sinh (để tương thích đầy đủ API tra cứu điểm & điểm danh)
  const attendanceRate =
    typeof studentDoc.attendanceRate === "number"
      ? studentDoc.attendanceRate
      : typeof classDoc?.attendanceRate === "number"
        ? classDoc.attendanceRate
        : 100;
  const absentCount = Number(studentDoc.absentCount) || 0;
  const excusedAbsentCount = Number(studentDoc.excusedAbsentCount) || 0;
  const unexcusedAbsentCount = Math.max(0, absentCount - excusedAbsentCount);
  const totalSessions = Number(studentDoc.totalSessions) || 45;
  const presentCount = Math.max(0, totalSessions - absentCount);
  const attendanceRecords = Array.isArray(studentDoc.attendanceRecords)
    ? studentDoc.attendanceRecords
    : [];

  return {
    student: {
      _id: studentId,
      fullName: studentDoc.fullName,
      userCode: studentDoc.userCode,
      email: studentDoc.email,
      className: classDoc?.name || studentDoc.className || "---",
      classId: (classDoc?._id || studentDoc.classRef || "")?.toString() || null,
      room: classDoc?.room || "P.101",
      academicYear: classDoc?.academicYear || "2025-2026",
      homeroomTeacher: classDoc?.homeroomTeacher
        ? {
            _id: classDoc.homeroomTeacher._id?.toString(),
            fullName: classDoc.homeroomTeacher.fullName,
            email: classDoc.homeroomTeacher.email,
          }
        : null,
    },
    grades: {
      currentGPA,
      academicPerformance,
      totalSubjects: subjects.length,
      totalRecords: gradeRecords.length,
      subjects,
      records: gradeRecords,
    },
    attendance: {
      attendanceRate,
      totalSessions,
      presentCount,
      absentCount,
      excusedAbsentCount,
      unexcusedAbsentCount,
      status:
        attendanceRate >= 95
          ? "Chuyên cần tốt"
          : attendanceRate >= 85
            ? "Đảm bảo chuyên cần"
            : "Cần lưu ý chuyên cần",
      records: attendanceRecords,
    },
  };
};

/**
 * [GET] /api/v1/parent/children
 * API lấy danh sách học sinh thuộc tài khoản Phụ huynh đang đăng nhập (dựa trên childrenRefs)
 */
const getLinkedChildren = async (req, res, next) => {
  try {
    const authorizedChildrenIds = req.authorizedChildrenIds || [];

    if (authorizedChildrenIds.length === 0) {
      return successResponse(
        res,
        {
          parentId: req.user.userId.toString(),
          totalChildren: 0,
          children: [],
        },
        "Tài khoản Phụ huynh hiện chưa có học sinh nào được liên kết"
      );
    }

    const studentsQuery = User.find({
      _id: { $in: authorizedChildrenIds },
      role: "student",
      isDeleted: { $ne: true },
    });

    const studentDocs =
      studentsQuery && typeof studentsQuery.select === "function"
        ? await studentsQuery
            .select(
              "_id fullName userCode email className classRef attendanceRate absentCount"
            )
            .populate({
              path: "classRef",
              select: "name room academicYear homeroomTeacher",
              populate: {
                path: "homeroomTeacher",
                select: "fullName email userCode",
              },
            })
            .lean()
        : Array.isArray(studentsQuery)
          ? studentsQuery
          : [];

    // Giữ đúng thứ tự trong childrenRefs của Phụ huynh
    const studentByIdMap = new Map(
      studentDocs.map((s) => [s._id.toString(), s])
    );

    const childrenList = await Promise.all(
      authorizedChildrenIds
        .map((id) => studentByIdMap.get(id.toString()))
        .filter(Boolean)
        .map(async (st) => {
          const summary = await buildChildAcademicAndAttendanceSummary(
            st,
            req.query
          );
          return {
            _id: summary.student._id,
            fullName: summary.student.fullName,
            userCode: summary.student.userCode,
            email: summary.student.email,
            className: summary.student.className,
            classId: summary.student.classId,
            room: summary.student.room,
            academicYear: summary.student.academicYear,
            homeroomTeacher: summary.student.homeroomTeacher,
            currentGPA: summary.grades.currentGPA,
            academicPerformance: summary.grades.academicPerformance,
            totalSubjects: summary.grades.totalSubjects,
            attendanceRate: summary.attendance.attendanceRate,
            absentCount: summary.attendance.absentCount,
            attendanceStatus: summary.attendance.status,
          };
        })
    );

    return successResponse(
      res,
      {
        parentId: req.user.userId.toString(),
        parentProfile: {
          _id: req.parentAccount?._id?.toString() || req.user.userId.toString(),
          fullName: req.parentAccount?.fullName || "Phụ huynh",
          userCode: req.parentAccount?.userCode || "---",
          email: req.parentAccount?.email || "",
        },
        totalChildren: childrenList.length,
        children: childrenList,
      },
      "Lấy danh sách học sinh được liên kết với tài khoản Phụ huynh thành công"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [GET] /api/v1/parent/children/:studentId/overview
 * (Hoặc /grades, /attendance)
 * API lấy điểm và điểm danh của từng học sinh được liên kết với tài khoản Phụ huynh
 */
const getLinkedChildAcademicAndAttendance = async (req, res, next) => {
  try {
    const targetChildId = req.targetChildId || req.params.studentId;
    const authorizedChildrenIds = req.authorizedChildrenIds || [];

    if (!targetChildId || !authorizedChildrenIds.includes(targetChildId.toString())) {
      return errorResponse(
        res,
        "Bạn không có quyền xem dữ liệu của học sinh không nằm trong danh sách con được liên kết (childrenRefs)!",
        403
      );
    }

    const studentQuery = User.findOne({
      _id: targetChildId,
      role: "student",
      isDeleted: { $ne: true },
    });
    const studentDoc =
      studentQuery && typeof studentQuery.select === "function"
        ? await studentQuery
            .select(
              "_id fullName userCode email className classRef attendanceRate absentCount excusedAbsentCount totalSessions attendanceRecords"
            )
            .lean()
        : await studentQuery;

    if (!studentDoc) {
      return errorResponse(
        res,
        "Không tìm thấy thông tin học sinh được liên kết!",
        404
      );
    }

    const detail = await buildChildAcademicAndAttendanceSummary(
      studentDoc,
      req.query
    );

    return successResponse(
      res,
      detail,
      `Lấy dữ liệu điểm số và điểm danh của học sinh ${studentDoc.fullName} thành công`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * [POST/PUT/PATCH/DELETE] /api/v1/admin/parents/:parentId/children
 * Cho phép Admin liên kết một tài khoản Phụ huynh với một hoặc nhiều học sinh (cập nhật childrenRefs)
 */
const linkParentWithChildren = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return errorResponse(
        res,
        "Chỉ Quản trị viên (Admin) mới có quyền cấu hình liên kết Phụ huynh - Học sinh!",
        403
      );
    }

    const { parentId } = req.params;
    const { studentIds = [], studentCodes = [], mode = "replace" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return errorResponse(res, "Mã tài khoản Phụ huynh không hợp lệ!", 400);
    }

    const parentDoc = await User.findOne({
      _id: parentId,
      role: "parent",
      isDeleted: { $ne: true },
    });

    if (!parentDoc) {
      return errorResponse(
        res,
        "Không tìm thấy tài khoản Phụ huynh trong hệ thống!",
        404
      );
    }

    // Tìm học sinh theo danh sách studentIds hoặc studentCodes
    const orFilters = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      const validObjIds = studentIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (validObjIds.length !== studentIds.length) {
        return errorResponse(
          res,
          "Danh sách mã định danh học sinh (studentIds) chứa ID không hợp lệ!",
          400
        );
      }
      orFilters.push({ _id: { $in: validObjIds } });
    }
    if (Array.isArray(studentCodes) && studentCodes.length > 0) {
      orFilters.push({ userCode: { $in: studentCodes } });
    }

    if (orFilters.length === 0) {
      return errorResponse(
        res,
        "Vui lòng cung cấp danh sách học sinh (studentIds hoặc studentCodes) để liên kết!",
        400
      );
    }

    const studentsQuery = User.find({
      role: "student",
      isDeleted: { $ne: true },
      $or: orFilters,
    });
    const matchedStudents =
      studentsQuery && typeof studentsQuery.select === "function"
        ? await studentsQuery.select("_id fullName userCode className").lean()
        : Array.isArray(studentsQuery)
          ? studentsQuery
          : [];

    if (matchedStudents.length === 0) {
      return errorResponse(
        res,
        "Không tìm thấy học sinh hợp lệ nào để liên kết!",
        404
      );
    }

    const matchedIds = matchedStudents.map((s) => s._id.toString());
    const existingIds = Array.isArray(parentDoc.childrenRefs)
      ? parentDoc.childrenRefs.map((id) => id.toString())
      : [];

    const finalChildrenRefs =
      mode === "append"
        ? [...new Set([...existingIds, ...matchedIds])]
        : [...new Set(matchedIds)];

    parentDoc.childrenRefs = finalChildrenRefs;
    if (typeof parentDoc.save === "function") {
      await parentDoc.save();
    }

    return successResponse(
      res,
      {
        parentId: parentDoc._id.toString(),
        fullName: parentDoc.fullName,
        userCode: parentDoc.userCode,
        childrenRefs: finalChildrenRefs,
        linkedStudents: matchedStudents,
      },
      `Đã liên kết tài khoản Phụ huynh ${parentDoc.fullName} với ${finalChildrenRefs.length} học sinh thành công`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLinkedChildren,
  getLinkedChildAcademicAndAttendance,
  linkParentWithChildren,
};
