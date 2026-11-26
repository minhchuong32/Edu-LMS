const mongoose = require("mongoose");
const User = require("../models/User");
const Class = require("../models/Class");
const TeachingAssignment = require("../models/TeachingAssignment");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Exam = require("../models/Exam");
const ExamAttempt = require("../models/ExamAttempt");
const GradeRecord = require("../models/GradeRecord");
const {
  calculateWeightedAverage,
  calculateOverallGPA,
  classifyAcademicPerformance,
} = require("../services/gradebook.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const toObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id.toString())
    : id;

/**
 * [GET] /api/v1/academic/student-dashboard
 * API thống kê cho Học sinh (theo tài khoản cá nhân), sử dụng MongoDB Aggregation:
 * 1. Thống kê điểm trung bình hiện tại của cá nhân (GradeRecord.aggregate)
 * 2. Theo dõi tiến độ bài tập: đã nộp / còn hạn / quá hạn (Assignment.aggregate / Submission)
 * 3. Danh sách bài kiểm tra sắp tới (Exam.aggregate / ExamAttempt)
 * 4. Phân quyền & Bảo mật: Học sinh chỉ được xem dữ liệu thống kê của chính mình;
 *    truy cập dữ liệu của học sinh khác hoặc lớp khác trả về HTTP 403.
 */
const getStudentDashboardStats = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (role !== "student") {
      return errorResponse(
        res,
        "Chỉ tài khoản Học sinh mới có quyền truy cập Dashboard cá nhân của học sinh!",
        403
      );
    }

    const requestedStudentId = req.query.studentId || req.params.studentId;
    if (
      requestedStudentId &&
      requestedStudentId !== "me" &&
      requestedStudentId.toString() !== userId.toString()
    ) {
      return errorResponse(
        res,
        "Học sinh chỉ được phép truy cập dữ liệu học tập cá nhân của chính mình!",
        403
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Mã học sinh không hợp lệ!", 400);
    }

    const studentObjectId = toObjectId(userId);

    // 1. Lấy thông tin hồ sơ Học sinh đang đăng nhập & Lớp học hiện tại
    const studentDoc = await User.findOne({
      _id: userId,
      isDeleted: { $ne: true },
    })
      .select("fullName userCode email className classRef role")
      .lean();

    if (!studentDoc) {
      return errorResponse(res, "Không tìm thấy hồ sơ học sinh!", 404);
    }

    let classId = studentDoc.classRef ? studentDoc.classRef.toString() : null;
    let className = studentDoc.className || null;

    if (!classId && className) {
      const clsDoc = await Class.findOne({
        name: className,
        isDeleted: false,
      })
        .select("_id name")
        .lean();
      if (clsDoc) {
        classId = clsDoc._id.toString();
      }
    } else if (classId && !className) {
      const clsDoc = await Class.findOne({
        _id: classId,
        isDeleted: false,
      })
        .select("_id name")
        .lean();
      if (clsDoc) {
        className = clsDoc.name;
      }
    }

    // Chặn học sinh cố tình truyền classId của lớp khác trên query/params (403 Forbidden)
    const requestedClassId = req.query.classId || req.params.classId;
    if (
      requestedClassId &&
      classId &&
      requestedClassId.toString() !== classId.toString()
    ) {
      return errorResponse(
        res,
        "Học sinh không có quyền truy cập dữ liệu thống kê của lớp học khác!",
        403
      );
    }

    // 2. Truy vấn các phân công giảng dạy (TeachingAssignment) thuộc lớp của học sinh
    const teachingAssignments = classId
      ? await TeachingAssignment.find({
          class: toObjectId(classId),
          isDeleted: false,
        })
          .populate("class", "name room academicYear")
          .populate("subject", "name code")
          .populate("teacher", "fullName email")
          .lean()
      : [];

    const taIds = teachingAssignments.map((ta) => ta._id);
    const taObjectIds = taIds.map(toObjectId);
    const taMapById = new Map(
      teachingAssignments.map((ta) => [ta._id.toString(), ta])
    );

    // =========================================================================
    // 3. THỐNG KÊ ĐIỂM TRUNG BÌNH HIỆN TẠI CỦA CÁ NHÂN (MongoDB Aggregation)
    // =========================================================================
    const subjectAverages = [];
    let totalGradeRecords = 0;

    let gradeAgg = null;
    if (typeof GradeRecord.aggregate === "function") {
      gradeAgg = await GradeRecord.aggregate([
        {
          $match: {
            student: studentObjectId,
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: "$teachingAssignment",
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
            teachingAssignmentId: "$_id",
            recordCount: 1,
            average: {
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
      ]);
    }

    if (Array.isArray(gradeAgg)) {
      gradeAgg.forEach((row) => {
        if (typeof row.average === "number") {
          const taIdStr = row.teachingAssignmentId?.toString();
          const taDoc = taMapById.get(taIdStr) || null;
          const subId = (
            taDoc?.subject?._id ||
            taDoc?.subject ||
            taIdStr ||
            "general"
          ).toString();
          const subName = taDoc?.subject?.name || "Môn học";
          const subCode = taDoc?.subject?.code || "---";
          const roundedAvg = Math.round(row.average * 10) / 10;

          totalGradeRecords += Number(row.recordCount) || 0;
          subjectAverages.push({
            subjectId: subId,
            teachingAssignmentId: taIdStr,
            subjectName: subName,
            subjectCode: subCode,
            average: roundedAvg,
            recordCount: Number(row.recordCount) || 0,
            performance: classifyAcademicPerformance(roundedAvg),
          });
        }
      });
    } else if (typeof GradeRecord.find === "function") {
      const gradeRecords = await GradeRecord.find({
        student: userId,
        isDeleted: false,
      })
        .populate({
          path: "teachingAssignment",
          select: "class subject academicYear semester",
          populate: [
            { path: "class", select: "name" },
            { path: "subject", select: "name code" },
          ],
        })
        .lean();

      totalGradeRecords = gradeRecords.length;
      const subjectGroups = new Map();
      gradeRecords.forEach((rec) => {
        const subId = (
          rec.teachingAssignment?.subject?._id ||
          rec.teachingAssignment?.subject ||
          rec.teachingAssignment?._id ||
          "general"
        ).toString();
        const subName = rec.teachingAssignment?.subject?.name || "Môn học";
        const subCode = rec.teachingAssignment?.subject?.code || "---";

        if (!subjectGroups.has(subId)) {
          subjectGroups.set(subId, {
            subjectId: subId,
            subjectName: subName,
            subjectCode: subCode,
            records: [],
          });
        }
        subjectGroups.get(subId).records.push(rec);
      });

      subjectGroups.forEach((group) => {
        const avg = calculateWeightedAverage(group.records);
        if (typeof avg === "number") {
          subjectAverages.push({
            subjectId: group.subjectId,
            subjectName: group.subjectName,
            subjectCode: group.subjectCode,
            average: avg,
            recordCount: group.records.length,
            performance: classifyAcademicPerformance(avg),
          });
        }
      });
    }

    const currentGPA = calculateOverallGPA(
      subjectAverages.map((s) => ({
        subjectName: s.subjectName,
        gpa: s.average,
        weight: 1,
      }))
    );
    const academicPerformance = classifyAcademicPerformance(currentGPA);

    // =========================================================================
    // 4. THEO DÕI TIẾN ĐỘ BÀI TẬP: ĐÃ NỘP / CÒN HẠN / QUÁ HẠN
    // =========================================================================
    const assignments =
      taObjectIds.length > 0
        ? await Assignment.find({
            teachingAssignment: { $in: taObjectIds },
            isDeleted: false,
            isActive: { $ne: false },
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
    const submissionByAssignId = new Map();

    if (assignmentIds.length > 0) {
      let subAgg = null;
      if (typeof Submission.aggregate === "function") {
        subAgg = await Submission.aggregate([
          {
            $match: {
              assignment: { $in: assignmentIds },
              student: studentObjectId,
              isDeleted: false,
            },
          },
          {
            $project: {
              assignment: 1,
              student: 1,
              fileUrl: 1,
              score: 1,
              isLate: 1,
              submittedAt: 1,
            },
          },
        ]);
      }

      const mySubmissions = Array.isArray(subAgg)
        ? subAgg
        : typeof Submission.find === "function"
          ? await Submission.find({
              assignment: { $in: assignmentIds },
              student: userId,
              isDeleted: false,
            }).lean()
          : [];

      mySubmissions.forEach((sub) => {
        if (sub && sub.assignment) {
          submissionByAssignId.set(sub.assignment.toString(), sub);
        }
      });
    }

    const now = new Date();
    let submittedCount = 0;
    let pendingInTimeCount = 0;
    let overdueUnsubmittedCount = 0;

    const assignmentItems = assignments.map((assign) => {
      const sub = submissionByAssignId.get(assign._id.toString()) || null;
      const hasSubmitted = Boolean(sub && sub.fileUrl);
      const dueDateObj = assign.dueDate ? new Date(assign.dueDate) : null;
      const isOverdue =
        dueDateObj && !Number.isNaN(dueDateObj.getTime())
          ? dueDateObj < now
          : false;

      let submissionCategory;
      let statusLabel;

      if (hasSubmitted) {
        submittedCount += 1;
        submissionCategory = "submitted";
        statusLabel =
          sub.score !== null && sub.score !== undefined
            ? `Đã nộp • ${sub.score}/10 điểm`
            : "Đã nộp";
      } else if (!isOverdue) {
        pendingInTimeCount += 1;
        submissionCategory = "pending_in_time";
        statusLabel = "Chưa nộp • Còn hạn";
      } else {
        overdueUnsubmittedCount += 1;
        submissionCategory = "overdue";
        statusLabel = "Chưa nộp • Quá hạn";
      }

      return {
        _id: assign._id.toString(),
        studentId: userId.toString(),
        title: assign.title,
        description: assign.description || "",
        dueDate: assign.dueDate,
        assignmentStatus: assign.status || "open",
        subjectName: assign.teachingAssignment?.subject?.name || "Môn học",
        className: assign.teachingAssignment?.class?.name || className || "---",
        hasSubmitted,
        isOverdue,
        submissionCategory, // 'submitted' | 'pending_in_time' | 'overdue'
        statusLabel,
        score: sub?.score ?? null,
        submittedAt: sub?.submittedAt || null,
      };
    });

    const totalAssignments = assignmentItems.length;
    const completionRate =
      totalAssignments > 0
        ? Math.round((submittedCount / totalAssignments) * 100)
        : 0;

    // =========================================================================
    // 5. DANH SÁCH BÀI KIỂM TRA SẮP TỚI
    // =========================================================================
    const publishedExams =
      taObjectIds.length > 0
        ? await Exam.find({
            teachingAssignment: { $in: taObjectIds },
            status: "published",
            isDeleted: false,
          })
            .sort({ createdAt: -1 })
            .populate({
              path: "teachingAssignment",
              select: "class subject teacher",
              populate: [
                { path: "class", select: "name" },
                { path: "subject", select: "name code" },
                { path: "teacher", select: "fullName" },
              ],
            })
            .lean()
        : [];

    const examIds = publishedExams.map((e) => toObjectId(e._id));
    const attemptByExamId = new Map();

    if (examIds.length > 0) {
      let attemptAgg = null;
      if (typeof ExamAttempt.aggregate === "function") {
        attemptAgg = await ExamAttempt.aggregate([
          {
            $match: {
              exam: { $in: examIds },
              student: studentObjectId,
            },
          },
          {
            $project: {
              exam: 1,
              student: 1,
              score: 1,
              submittedAt: 1,
              status: 1,
            },
          },
        ]);
      }

      const myAttempts = Array.isArray(attemptAgg)
        ? attemptAgg
        : typeof ExamAttempt.find === "function"
          ? await ExamAttempt.find({
              exam: { $in: examIds },
              student: userId,
            }).lean()
          : [];

      myAttempts.forEach((att) => {
        if (att && att.exam) {
          attemptByExamId.set(att.exam.toString(), att);
        }
      });
    }

    const upcomingExams = publishedExams.map((exam) => {
      const attempt = attemptByExamId.get(exam._id.toString()) || null;
      const isCompleted = Boolean(attempt);

      return {
        _id: exam._id.toString(),
        studentId: userId.toString(),
        title: exam.title,
        description: exam.description || "",
        duration: exam.duration || 15,
        totalQuestions:
          exam.totalQuestions ||
          (Array.isArray(exam.questions) ? exam.questions.length : 0),
        scoreWeight: exam.scoreWeight || 1,
        subjectName: exam.teachingAssignment?.subject?.name || "Môn học",
        subjectCode: exam.teachingAssignment?.subject?.code || "---",
        className: exam.teachingAssignment?.class?.name || className || "---",
        teacherName:
          exam.teachingAssignment?.teacher?.fullName || "Giáo viên bộ môn",
        scheduledAt: exam.scheduledAt || exam.publishedAt || exam.createdAt,
        isCompleted,
        attemptScore: attempt?.score ?? null,
        submittedAt: attempt?.submittedAt || null,
      };
    });

    return successResponse(
      res,
      {
        studentId: userId.toString(),
        studentProfile: {
          _id: userId.toString(),
          fullName: studentDoc.fullName,
          userCode: studentDoc.userCode,
          className: className || "---",
          classId,
        },
        gpaOverview: {
          currentGPA,
          academicPerformance,
          totalSubjectsEvaluated: subjectAverages.length,
          totalGradeRecords,
          subjectAverages,
        },
        assignmentProgress: {
          totalAssignments,
          submittedCount,
          pendingInTimeCount,
          overdueUnsubmittedCount,
          completionRate,
          items: assignmentItems,
        },
        upcomingExams,
      },
      "Lấy dữ liệu Dashboard cá nhân của Học sinh thành công"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentDashboardStats,
};
