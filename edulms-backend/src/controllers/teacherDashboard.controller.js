const mongoose = require("mongoose");
const Class = require("../models/Class");
const User = require("../models/User");
const TeachingAssignment = require("../models/TeachingAssignment");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const GradeRecord = require("../models/GradeRecord");
const {
  calculateWeightedAverage,
  classifyAcademicPerformance,
} = require("../services/gradebook.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const toObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id.toString())
    : id;

/**
 * [GET] /api/v1/academic/teacher-dashboard
 * API thống kê cho Giáo viên (theo lớp giảng dạy / chủ nhiệm), sử dụng MongoDB Aggregation:
 * 1. Thống kê sĩ số học sinh trong các lớp phụ trách (User.aggregate)
 * 2. Thống kê điểm trung bình của từng lớp (GradeRecord.aggregate)
 * 3. Thống kê số bài tập cần chấm (Submission.aggregate)
 * 4. Danh sách học sinh có điểm thấp (< 5.0) trong các lớp phụ trách (GradeRecord.aggregate)
 * 5. Phân quyền & Bảo mật: Giáo viên chỉ được xem thống kê của các lớp mình giảng dạy hoặc chủ nhiệm;
 *    truy cập dữ liệu ngoài phạm vi được phép trả về HTTP 403.
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

    // Tập hợp tất cả các Class ID và TeachingAssignment ID thuộc phạm vi của giáo viên
    const classIdSet = new Set();
    homeroomClasses.forEach((cls) => {
      if (cls?._id) classIdSet.add(cls._id.toString());
    });
    teachingAssignments.forEach((ta) => {
      const cId = ta?.class?._id || ta?.class;
      if (cId) classIdSet.add(cId.toString());
    });

    const authorizedClassIds = Array.from(classIdSet);
    const authorizedTaIds = teachingAssignments.map((ta) =>
      ta._id.toString()
    );

    // Kiểm tra phân quyền truy cập theo classId hoặc teachingAssignmentId (nếu truyền trên query/params)
    const requestedClassId = req.query.classId || req.params.classId;
    if (
      role === "teacher" &&
      requestedClassId &&
      !authorizedClassIds.includes(requestedClassId.toString())
    ) {
      return errorResponse(
        res,
        "Giáo viên không có quyền xem thống kê của lớp nằm ngoài phạm vi giảng dạy hoặc chủ nhiệm!",
        403
      );
    }

    const requestedTaId =
      req.query.teachingAssignmentId ||
      req.query.teachingAssignment ||
      req.params.teachingAssignmentId;
    if (
      role === "teacher" &&
      requestedTaId &&
      !authorizedTaIds.includes(requestedTaId.toString())
    ) {
      return errorResponse(
        res,
        "Giáo viên không có quyền xem thống kê của phân công giảng dạy nằm ngoài phạm vi phụ trách!",
        403
      );
    }

    // Nếu giáo viên lọc theo 1 classId hoặc teachingAssignmentId hợp lệ trong phạm vi
    const filteredClassIds = requestedClassId
      ? authorizedClassIds.filter((id) => id === requestedClassId.toString())
      : authorizedClassIds;
    const filteredTaIds = requestedTaId
      ? authorizedTaIds.filter((id) => id === requestedTaId.toString())
      : authorizedTaIds;

    const classObjectIds = filteredClassIds.map(toObjectId);

    // Tất cả phân công giảng dạy liên quan tới các lớp giáo viên phụ trách (bao gồm các môn của lớp chủ nhiệm để tính ĐTB lớp chủ nhiệm)
    const homeroomClassIds = homeroomClasses.map((c) => c._id.toString());
    let homeroomTaList = [];
    if (homeroomClassIds.length > 0 && typeof TeachingAssignment.find === "function") {
      try {
        const hrTaQuery = TeachingAssignment.find({
          class: { $in: homeroomClassIds.map(toObjectId) },
          isDeleted: false,
        });
        if (hrTaQuery && typeof hrTaQuery.select === "function") {
          homeroomTaList = await hrTaQuery.select("_id class subject").lean();
        } else if (Array.isArray(hrTaQuery)) {
          homeroomTaList = hrTaQuery;
        }
      } catch {
        homeroomTaList = [];
      }
    }

    const taToClassMap = new Map();
    teachingAssignments.forEach((ta) => {
      const cId = (ta.class?._id || ta.class || "").toString();
      if (cId) taToClassMap.set(ta._id.toString(), cId);
    });
    (Array.isArray(homeroomTaList) ? homeroomTaList : []).forEach((ta) => {
      const cId = (ta.class?._id || ta.class || "").toString();
      if (cId && ta._id) taToClassMap.set(ta._id.toString(), cId);
    });

    const allScopeTaIds = Array.from(
      new Set([...filteredTaIds, ...Array.from(taToClassMap.keys())])
    );
    const filteredTaObjectIds = filteredTaIds.map(toObjectId);
    const allScopeTaObjectIds = allScopeTaIds.map(toObjectId);

    // =========================================================================
    // 2. THỐNG KÊ SĨ SỐ HỌC SINH TRONG CÁC LỚP PHỤ TRÁCH (MongoDB Aggregation)
    // =========================================================================
    const studentCountByClass = new Map();
    let totalUniqueStudents = 0;

    if (classObjectIds.length > 0) {
      let studentAgg = null;
      if (typeof User.aggregate === "function") {
        studentAgg = await User.aggregate([
          {
            $match: {
              role: "student",
              isDeleted: { $ne: true },
              classRef: { $in: classObjectIds },
            },
          },
          {
            $group: {
              _id: "$classRef",
              studentCount: { $sum: 1 },
            },
          },
        ]);
      }

      if (Array.isArray(studentAgg)) {
        studentAgg.forEach((row) => {
          if (row && row._id) {
            const count = Number(row.studentCount) || 0;
            studentCountByClass.set(row._id.toString(), count);
            totalUniqueStudents += count;
          }
        });
      } else if (typeof User.find === "function") {
        const studentsInClasses = await User.find({
          role: "student",
          isDeleted: { $ne: true },
          $or: [{ classRef: { $in: filteredClassIds } }],
        })
          .select("fullName userCode email className classRef")
          .lean();

        studentsInClasses.forEach((st) => {
          const cId = st.classRef?.toString();
          if (cId) {
            studentCountByClass.set(
              cId,
              (studentCountByClass.get(cId) || 0) + 1
            );
          }
        });
        totalUniqueStudents = studentsInClasses.length;
      }
    }

    // =========================================================================
    // 3. THỐNG KÊ ĐIỂM TRUNG BÌNH CỦA TỪNG LỚP & HỌC SINH ĐIỂM THẤP (MongoDB Aggregation)
    // =========================================================================
    const studentTaAverages = []; // [{ studentId, teachingAssignmentId, averageScore, student, teachingAssignment }]

    if (allScopeTaObjectIds.length > 0) {
      let gradeAgg = null;
      if (typeof GradeRecord.aggregate === "function") {
        gradeAgg = await GradeRecord.aggregate([
          {
            $match: {
              teachingAssignment: { $in: allScopeTaObjectIds },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: {
                student: "$student",
                teachingAssignment: "$teachingAssignment",
              },
              weightedSum: {
                $sum: {
                  $multiply: ["$value", { $ifNull: ["$weight", 1] }],
                },
              },
              totalWeight: {
                $sum: { $ifNull: ["$weight", 1] },
              },
              recordCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              studentId: "$_id.student",
              teachingAssignmentId: "$_id.teachingAssignment",
              recordCount: 1,
              averageScore: {
                $cond: [
                  { $gt: ["$totalWeight", 0] },
                  {
                    $round: [
                      { $divide: ["$weightedSum", "$totalWeight"] },
                      1,
                    ],
                  },
                  null,
                ],
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "studentId",
              foreignField: "_id",
              as: "studentInfo",
            },
          },
          {
            $unwind: {
              path: "$studentInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
        ]);
      }

      if (Array.isArray(gradeAgg)) {
        gradeAgg.forEach((row) => {
          if (typeof row.averageScore === "number") {
            studentTaAverages.push({
              studentId: row.studentId?.toString(),
              teachingAssignmentId: row.teachingAssignmentId?.toString(),
              averageScore: Math.round(row.averageScore * 10) / 10,
              recordCount: row.recordCount || 1,
              student: row.studentInfo || null,
            });
          }
        });
      } else if (typeof GradeRecord.find === "function") {
        const gradeRecords = await GradeRecord.find({
          teachingAssignment: { $in: allScopeTaIds },
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
          .lean();

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
              studentId: stId,
              teachingAssignmentId: taId,
              student: rec.student,
              teachingAssignment: rec.teachingAssignment,
              records: [],
            });
          }
          groupedGrades.get(key).records.push(rec);
        });

        groupedGrades.forEach((group) => {
          const avg = calculateWeightedAverage(group.records);
          if (typeof avg === "number") {
            studentTaAverages.push({
              studentId: group.studentId,
              teachingAssignmentId: group.teachingAssignmentId,
              averageScore: avg,
              recordCount: group.records.length,
              student: group.student,
              teachingAssignment: group.teachingAssignment,
            });
          }
        });
      }
    }

    // Tính điểm trung bình của từng TeachingAssignment và từng Class
    const avgByTaMap = new Map(); // taId -> { sum, count }
    const avgByClassMap = new Map(); // classId -> { sum, count }

    studentTaAverages.forEach((item) => {
      const taId = item.teachingAssignmentId;
      const cId =
        taToClassMap.get(taId) ||
        (
          item.teachingAssignment?.class?._id ||
          item.teachingAssignment?.class ||
          ""
        ).toString();

      if (taId) {
        const curTa = avgByTaMap.get(taId) || { sum: 0, count: 0 };
        curTa.sum += item.averageScore;
        curTa.count += 1;
        avgByTaMap.set(taId, curTa);
      }

      if (cId) {
        const curCls = avgByClassMap.get(cId) || { sum: 0, count: 0 };
        curCls.sum += item.averageScore;
        curCls.count += 1;
        avgByClassMap.set(cId, curCls);
      }
    });

    const getTaAverage = (taId) => {
      const entry = avgByTaMap.get(taId);
      if (!entry || entry.count === 0) return null;
      return Math.round((entry.sum / entry.count) * 10) / 10;
    };

    const getClassAverage = (cId) => {
      const entry = avgByClassMap.get(cId);
      if (!entry || entry.count === 0) return null;
      return Math.round((entry.sum / entry.count) * 10) / 10;
    };

    // =========================================================================
    // 4. XÂY DỰNG CARD TỔNG QUAN LỚP (SĨ SỐ & ĐIỂM TRUNG BÌNH CỦA TỪNG LỚP)
    // =========================================================================
    const classesOverview = [];
    const classAverageStats = [];

    homeroomClasses.forEach((cls) => {
      const cId = cls._id.toString();
      if (!filteredClassIds.includes(cId)) return;

      const count = studentCountByClass.get(cId) ?? cls.studentCount ?? 0;
      const classAverage = getClassAverage(cId);

      const cardItem = {
        _id: `homeroom_${cId}`,
        classId: cId,
        className: cls.name,
        room: cls.room || "P.101",
        capacity: cls.capacity || 45,
        studentCount: count,
        classAverage,
        averageScore: classAverage,
        performance:
          typeof classAverage === "number"
            ? classifyAcademicPerformance(classAverage)
            : "Chưa xếp loại",
        roleType: "homeroom",
        roleLabel: "Lớp Chủ nhiệm (GVCN)",
        subjectName: "Chủ nhiệm lớp",
        subjectCode: "GVCN",
        academicYear: cls.academicYear || "2025-2026",
        semester: "CaNam",
      };

      classesOverview.push(cardItem);
      classAverageStats.push({
        classId: cId,
        className: cls.name,
        roleType: "homeroom",
        subjectName: "Tổng hợp lớp chủ nhiệm",
        studentCount: count,
        averageScore: classAverage,
      });
    });

    const taMapById = new Map();
    teachingAssignments.forEach((ta) => {
      const taId = ta._id.toString();
      taMapById.set(taId, ta);

      if (!filteredTaIds.includes(taId)) return;
      const clsObj = ta.class || {};
      const cId = (clsObj._id || ta.class || "").toString();
      if (requestedClassId && cId !== requestedClassId.toString()) return;

      const isAlsoHomeroom = homeroomClasses.some(
        (h) => h._id.toString() === cId
      );
      const count = studentCountByClass.get(cId) ?? clsObj.studentCount ?? 0;
      const taAverage = getTaAverage(taId) ?? getClassAverage(cId);

      const cardItem = {
        _id: taId,
        teachingAssignmentId: taId,
        classId: cId,
        className: clsObj.name || "Lớp học",
        room: clsObj.room || "P.101",
        capacity: clsObj.capacity || 45,
        studentCount: count,
        classAverage: taAverage,
        averageScore: taAverage,
        performance:
          typeof taAverage === "number"
            ? classifyAcademicPerformance(taAverage)
            : "Chưa xếp loại",
        roleType: isAlsoHomeroom ? "both" : "subject_teacher",
        roleLabel: isAlsoHomeroom
          ? "GVCN & Giảng dạy"
          : "Lớp Giảng dạy Bộ môn",
        subjectName: ta.subject?.name || "Môn học",
        subjectCode: ta.subject?.code || "---",
        academicYear: ta.academicYear || "2025-2026",
        semester: ta.semester || "HK1",
      };

      classesOverview.push(cardItem);
      classAverageStats.push({
        teachingAssignmentId: taId,
        classId: cId,
        className: clsObj.name || "Lớp học",
        roleType: cardItem.roleType,
        subjectName: cardItem.subjectName,
        studentCount: count,
        averageScore: taAverage,
      });
    });

    // =========================================================================
    // 5. THỐNG KÊ SỐ BÀI TẬP CẦN CHẤM (MongoDB Aggregation)
    // =========================================================================
    const assignments =
      filteredTaObjectIds.length > 0
        ? await Assignment.find({
            teachingAssignment: { $in: filteredTaObjectIds },
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

    const assignmentIds = assignments.map((a) => toObjectId(a._id));
    const submissionStatsByAssignId = new Map();

    if (assignmentIds.length > 0) {
      let subAgg = null;
      if (typeof Submission.aggregate === "function") {
        subAgg = await Submission.aggregate([
          {
            $match: {
              assignment: { $in: assignmentIds },
              isDeleted: false,
            },
          },
          {
            $group: {
              _id: "$assignment",
              totalSubmissions: { $sum: 1 },
              ungradedCount: {
                $sum: {
                  $cond: [{ $eq: [{ $ifNull: ["$score", null] }, null] }, 1, 0],
                },
              },
              lateCount: {
                $sum: {
                  $cond: [{ $eq: ["$isLate", true] }, 1, 0],
                },
              },
            },
          },
        ]);
      }

      if (Array.isArray(subAgg)) {
        subAgg.forEach((row) => {
          if (row && row._id) {
            submissionStatsByAssignId.set(row._id.toString(), {
              totalSubmissions: Number(row.totalSubmissions) || 0,
              ungradedCount: Number(row.ungradedCount) || 0,
              lateCount: Number(row.lateCount) || 0,
            });
          }
        });
      } else if (typeof Submission.find === "function") {
        const submissions = await Submission.find({
          assignment: { $in: assignmentIds },
          isDeleted: false,
        })
          .select("assignment student score isLate submittedAt")
          .lean();

        assignments.forEach((assign) => {
          const aId = assign._id.toString();
          const assignSubs = submissions.filter(
            (s) => s.assignment?.toString() === aId
          );
          const ungradedCount = assignSubs.filter(
            (s) => s.score === null || s.score === undefined
          ).length;
          const lateCount = assignSubs.filter((s) => Boolean(s.isLate)).length;
          submissionStatsByAssignId.set(aId, {
            totalSubmissions: assignSubs.length,
            ungradedCount,
            lateCount,
          });
        });
      }
    }

    const pendingAssignments = [];
    assignments.forEach((assign) => {
      const aId = assign._id.toString();
      const stats = submissionStatsByAssignId.get(aId) || {
        totalSubmissions: 0,
        ungradedCount: 0,
        lateCount: 0,
      };

      if (stats.ungradedCount > 0 || assign.status === "open") {
        pendingAssignments.push({
          _id: aId,
          title: assign.title,
          dueDate: assign.dueDate,
          status: assign.status,
          className: assign.teachingAssignment?.class?.name || "---",
          subjectName: assign.teachingAssignment?.subject?.name || "Môn học",
          teachingAssignmentId:
            assign.teachingAssignment?._id?.toString() || "",
          totalSubmissions: stats.totalSubmissions,
          ungradedCount: stats.ungradedCount,
          gradedCount: stats.totalSubmissions - stats.ungradedCount,
          lateCount: stats.lateCount,
        });
      }
    });

    // =========================================================================
    // 6. DANH SÁCH HỌC SINH CÓ ĐIỂM THẤP (< 5.0) TRONG CÁC LỚP PHỤ TRÁCH
    // =========================================================================
    const studentAlerts = [];
    const homeroomClassMap = new Map(
      homeroomClasses.map((c) => [c._id.toString(), c])
    );

    studentTaAverages.forEach((item) => {
      const avg = item.averageScore;
      if (typeof avg !== "number" || avg >= 5.0) return;

      const taObj =
        taMapById.get(item.teachingAssignmentId) ||
        item.teachingAssignment ||
        {};
      const cId =
        taToClassMap.get(item.teachingAssignmentId) ||
        (taObj.class?._id || taObj.class || "").toString();

      if (requestedClassId && cId && cId !== requestedClassId.toString()) {
        return;
      }

      const clsName =
        taObj.class?.name ||
        homeroomClassMap.get(cId)?.name ||
        item.student?.className ||
        "---";
      const subName = taObj.subject?.name || "Môn học";
      const stName = item.student?.fullName || "Học sinh";
      const stCode = item.student?.userCode || "---";

      studentAlerts.push({
        _id: `low_grade_${item.studentId}_${item.teachingAssignmentId}`,
        studentId: item.studentId,
        studentName: stName,
        userCode: stCode,
        classId: cId || null,
        className: clsName,
        teachingAssignmentId: item.teachingAssignmentId,
        subjectName: subName,
        alertType: "low_grade",
        alertLabel: avg < 3.5 ? "Điểm kém (< 3.5)" : "Điểm yếu (< 5.0)",
        severity: avg < 3.5 ? "high" : "medium",
        averageScore: avg,
        detail: `ĐTB môn ${subName}: ${avg.toFixed(1)}/10 (Dưới mức đạt 5.0)`,
      });
    });

    // Tổng hợp số liệu thẻ summary
    const totalPendingGrading = pendingAssignments.reduce(
      (sum, item) => sum + (item.ungradedCount || 0),
      0
    );
    const validClassAvgs = classesOverview
      .map((c) => c.classAverage)
      .filter((v) => typeof v === "number");
    const overallClassAverage =
      validClassAvgs.length > 0
        ? Math.round(
            (validClassAvgs.reduce((acc, v) => acc + v, 0) /
              validClassAvgs.length) *
              10
          ) / 10
        : null;

    return successResponse(
      res,
      {
        teacherId: targetTeacherId.toString(),
        summary: {
          totalClasses: classesOverview.length,
          homeroomCount: homeroomClasses.length,
          teachingSubjectCount: teachingAssignments.length,
          totalStudents: totalUniqueStudents,
          overallClassAverage,
          totalPendingGrading,
          pendingAssignmentsWithUngradedCount: pendingAssignments.filter(
            (a) => a.ungradedCount > 0
          ).length,
          totalAlerts: studentAlerts.length,
          lowGradeStudentsCount: studentAlerts.length,
        },
        classesOverview,
        classAverageStats,
        pendingAssignments,
        lowGradeStudents: studentAlerts,
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
