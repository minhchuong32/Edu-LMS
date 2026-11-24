const mongoose = require("mongoose");
const Class = require("../models/Class");
const User = require("../models/User");
const TeachingAssignment = require("../models/TeachingAssignment");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const GradeRecord = require("../models/GradeRecord");
const { calculateWeightedAverage } = require("../services/gradebook.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * [GET] /api/v1/academic/teacher-dashboard
 * Lấy dữ liệu tổng quan Dashboard cho Giáo viên:
 * - Danh sách lớp chủ nhiệm (GVCN) và lớp đang giảng dạy bộ môn (kèm sĩ số)
 * - Danh sách bài tập cần chấm (số bài nộp chưa chấm score === null)
 * - Danh sách cảnh báo học sinh có điểm trung bình thấp (< 5.0)
 * - Kiểm soát phân quyền chặt chẽ: chỉ trả về dữ liệu thuộc phạm vi Giáo viên được phép truy cập
 */
const getTeacherDashboardStats = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (!["teacher", "admin"].includes(role)) {
      return errorResponse(
        res,
        "Chỉ tài khoản Giáo viên hoặc Quản trị viên mới có quyền truy cập thống kê giảng dạy!",
        403
      );
    }

    const requestedTeacherId = req.query.teacherId || req.params.teacherId;
    if (
      role === "teacher" &&
      requestedTeacherId &&
      requestedTeacherId !== "me" &&
      requestedTeacherId.toString() !== userId.toString()
    ) {
      return errorResponse(
        res,
        "Bạn không có quyền xem dữ liệu thống kê của giáo viên khác!",
        403
      );
    }

    const targetTeacherId =
      role === "admin" && requestedTeacherId && requestedTeacherId !== "me"
        ? requestedTeacherId
        : userId;

    if (!mongoose.Types.ObjectId.isValid(targetTeacherId)) {
      return errorResponse(res, "Mã giáo viên không hợp lệ!", 400);
    }

    // 1. Truy vấn các lớp chủ nhiệm (GVCN) và phân công giảng dạy bộ môn của giáo viên
    const [homeroomClasses, teachingAssignments] = await Promise.all([
      Class.find({
        homeroomTeacher: targetTeacherId,
        isDeleted: false,
      })
        .populate("grade", "level name")
        .populate("homeroomTeacher", "fullName userCode email")
        .lean(),
      TeachingAssignment.find({
        teacher: targetTeacherId,
        isDeleted: false,
      })
        .populate("class", "name room capacity academicYear homeroomTeacher")
        .populate("subject", "name code")
        .populate("teacher", "fullName userCode email")
        .lean(),
    ]);

    // Tập hợp tất cả các Class ID thuộc phạm vi của giáo viên
    const classIdSet = new Set();
    homeroomClasses.forEach((cls) => {
      if (cls?._id) classIdSet.add(cls._id.toString());
    });
    teachingAssignments.forEach((ta) => {
      const cId = ta?.class?._id || ta?.class;
      if (cId) classIdSet.add(cId.toString());
    });

    const authorizedClassIds = Array.from(classIdSet);
    const authorizedTaIds = teachingAssignments.map((ta) => ta._id);

    // 2. Truy vấn danh sách học sinh thuộc các lớp được phép truy cập
    const studentsInClasses =
      authorizedClassIds.length > 0
        ? await User.find({
            role: "student",
            isDeleted: { $ne: true },
            $or: [{ classRef: { $in: authorizedClassIds } }],
          })
            .select("fullName userCode email className classRef")
            .lean()
        : [];

    // Đếm sĩ số theo từng lớp
    const studentCountByClass = new Map();
    studentsInClasses.forEach((st) => {
      const cId = st.classRef?.toString();
      if (cId) {
        studentCountByClass.set(cId, (studentCountByClass.get(cId) || 0) + 1);
      }
    });

    // 3. Xây dựng danh sách Card Tổng quan Lớp (gộp thông tin lớp chủ nhiệm & lớp giảng dạy)
    const classesOverview = [];

    homeroomClasses.forEach((cls) => {
      const cId = cls._id.toString();
      const count = studentCountByClass.get(cId) || cls.studentCount || 0;

      classesOverview.push({
        _id: `homeroom_${cId}`,
        classId: cId,
        className: cls.name,
        room: cls.room || "P.101",
        capacity: cls.capacity || 45,
        studentCount: count,
        roleType: "homeroom",
        roleLabel: "Lớp Chủ nhiệm (GVCN)",
        subjectName: "Chủ nhiệm lớp",
        subjectCode: "GVCN",
        academicYear: cls.academicYear || "2025-2026",
        semester: "CaNam",
      });
    });

    teachingAssignments.forEach((ta) => {
      const clsObj = ta.class || {};
      const cId = (clsObj._id || ta.class || "").toString();
      const isAlsoHomeroom = homeroomClasses.some(
        (h) => h._id.toString() === cId
      );
      const count =
        studentCountByClass.get(cId) || clsObj.studentCount || 0;

      classesOverview.push({
        _id: ta._id.toString(),
        teachingAssignmentId: ta._id.toString(),
        classId: cId,
        className: clsObj.name || "Lớp học",
        room: clsObj.room || "P.101",
        capacity: clsObj.capacity || 45,
        studentCount: count,
        roleType: isAlsoHomeroom ? "both" : "subject_teacher",
        roleLabel: isAlsoHomeroom
          ? "GVCN & Giảng dạy"
          : "Lớp Giảng dạy Bộ môn",
        subjectName: ta.subject?.name || "Môn học",
        subjectCode: ta.subject?.code || "---",
        academicYear: ta.academicYear || "2025-2026",
        semester: ta.semester || "HK1",
      });
    });

    // 4. Truy vấn danh sách Bài tập cần chấm thuộc các TeachingAssignment của giáo viên
    const assignments =
      authorizedTaIds.length > 0
        ? await Assignment.find({
            teachingAssignment: { $in: authorizedTaIds },
            isDeleted: false,
          })
            .sort({ dueDate: 1 })
            .populate({
              path: "teachingAssignment",
              select: "class subject teacher",
              populate: [
                { path: "class", select: "name" },
                { path: "subject", select: "name code" },
              ],
            })
            .lean()
        : [];

    const assignmentIds = assignments.map((a) => a._id);
    const submissions =
      assignmentIds.length > 0
        ? await Submission.find({
            assignment: { $in: assignmentIds },
            isDeleted: false,
          })
            .select("assignment student score isLate submittedAt")
            .lean()
        : [];

    const pendingAssignments = [];
    assignments.forEach((assign) => {
      const assignSubs = submissions.filter(
        (s) => s.assignment?.toString() === assign._id.toString()
      );
      const ungradedCount = assignSubs.filter(
        (s) => s.score === null || s.score === undefined
      ).length;
      const lateCount = assignSubs.filter((s) => Boolean(s.isLate)).length;

      if (ungradedCount > 0 || assign.status === "open") {
        pendingAssignments.push({
          _id: assign._id.toString(),
          title: assign.title,
          dueDate: assign.dueDate,
          status: assign.status,
          className: assign.teachingAssignment?.class?.name || "---",
          subjectName: assign.teachingAssignment?.subject?.name || "Môn học",
          teachingAssignmentId:
            assign.teachingAssignment?._id?.toString() || "",
          totalSubmissions: assignSubs.length,
          ungradedCount,
          gradedCount: assignSubs.length - ungradedCount,
          lateCount,
        });
      }
    });

    // 5. Xây dựng Cảnh báo Học sinh (Điểm trung bình thấp < 5.0)
    const gradeRecords =
      authorizedTaIds.length > 0
        ? await GradeRecord.find({
            teachingAssignment: { $in: authorizedTaIds },
            isDeleted: false,
          })
            .populate("student", "fullName userCode email className")
            .populate({
              path: "teachingAssignment",
              select: "class subject",
              populate: [
                { path: "class", select: "name" },
                { path: "subject", select: "name code" },
              ],
            })
            .lean()
        : [];

    const studentAlerts = [];
    const groupedGrades = new Map();

    gradeRecords.forEach((rec) => {
      const stId = (rec.student?._id || rec.student || "").toString();
      const taId = (
        rec.teachingAssignment?._id ||
        rec.teachingAssignment ||
        ""
      ).toString();
      if (!stId || !taId) return;

      const key = `${stId}_${taId}`;
      if (!groupedGrades.has(key)) {
        groupedGrades.set(key, {
          student: rec.student,
          teachingAssignment: rec.teachingAssignment,
          records: [],
        });
      }
      groupedGrades.get(key).records.push(rec);
    });

    groupedGrades.forEach((group, key) => {
      const avg = calculateWeightedAverage(group.records);
      if (typeof avg === "number" && avg < 5.0) {
        studentAlerts.push({
          _id: `low_grade_${key}`,
          studentId: (group.student?._id || group.student).toString(),
          studentName: group.student?.fullName || "Học sinh",
          userCode: group.student?.userCode || "---",
          className:
            group.teachingAssignment?.class?.name ||
            group.student?.className ||
            "---",
          subjectName:
            group.teachingAssignment?.subject?.name || "Môn học",
          alertType: "low_grade",
          alertLabel: avg < 3.5 ? "Điểm kém (< 3.5)" : "Điểm yếu (< 5.0)",
          severity: avg < 3.5 ? "high" : "medium",
          averageScore: avg,
          detail: `ĐTB môn ${group.teachingAssignment?.subject?.name || ""}: ${avg.toFixed(1)}/10 (Dưới mức đạt 5.0)`,
        });
      }
    });

    // Tổng hợp số liệu thẻ summary
    const totalPendingGrading = pendingAssignments.reduce(
      (sum, item) => sum + (item.ungradedCount || 0),
      0
    );

    return successResponse(
      res,
      {
        teacherId: targetTeacherId.toString(),
        summary: {
          totalClasses: classesOverview.length,
          homeroomCount: homeroomClasses.length,
          teachingSubjectCount: teachingAssignments.length,
          totalStudents: studentsInClasses.length,
          totalPendingGrading,
          totalAlerts: studentAlerts.length,
        },
        classesOverview,
        pendingAssignments,
        studentAlerts,
      },
      "Lấy dữ liệu thống kê Dashboard Giáo viên thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeacherDashboardStats,
};
