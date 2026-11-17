const submissionService = require("../services/submission.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * Trích xuất ngữ cảnh từ request và các middleware kiểm tra quyền
 */
const getRequestContext = (req) => ({
  user: req.user,
  student: req.student,
  studentClass: req.studentClass,
  targetAssignmentDoc: req.targetAssignmentDoc,
  targetTeachingAssignment: req.targetTeachingAssignment,
  targetSubmissionDoc: req.targetSubmissionDoc,
});

/**
 * Xử lý lỗi từ tầng service trả về đúng định dạng API response
 */
const handleServiceError = (res, next, error) => {
  if (error && error.statusCode) {
    return errorResponse(res, error.message, error.statusCode);
  }
  return next(error);
};

/**
 * [POST] /api/v1/submissions
 * [POST] /api/v1/assignments/:assignmentId/submissions
 * Học sinh nộp bài tập (tự động tính isLate dựa trên submittedAt và dueDate)
 */
const submitAssignment = async (req, res, next) => {
  try {
    const assignmentId =
      req.params.assignmentId || req.params.id || req.body?.assignment;

    const { submission, isResubmission, isLate } =
      await submissionService.submitAssignment(
        {
          ...req.body,
          assignment: assignmentId,
        },
        getRequestContext(req)
      );

    const statusLabel = isLate ? " (Nộp trễ hạn)" : " (Đúng hạn)";
    const message = isResubmission
      ? `Cập nhật bài nộp thành công${statusLabel}`
      : `Nộp bài tập thành công${statusLabel}`;

    return successResponse(
      res,
      submission,
      message,
      isResubmission ? 200 : 201
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/submissions?assignment=:assignmentId
 * [GET] /api/v1/submissions/assignment/:assignmentId
 * [GET] /api/v1/assignments/:assignmentId/submissions
 * Lấy danh sách bài nộp theo bài tập
 */
const getSubmissionsByAssignment = async (req, res, next) => {
  try {
    const assignmentId =
      req.params.assignmentId || req.params.id || req.query.assignment;

    const submissions = await submissionService.getSubmissionsByAssignment(
      assignmentId,
      req.query,
      getRequestContext(req)
    );

    return successResponse(
      res,
      submissions,
      "Lấy danh sách bài nộp thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [GET] /api/v1/submissions/my/:assignmentId
 * [GET] /api/v1/assignments/:assignmentId/my-submission
 * Lấy bài nộp của học sinh hiện tại cho một bài tập
 */
const getMySubmission = async (req, res, next) => {
  try {
    const assignmentId =
      req.params.assignmentId || req.params.id || req.query.assignment;

    const submission = await submissionService.getMySubmission(
      assignmentId,
      getRequestContext(req)
    );

    return successResponse(
      res,
      submission,
      "Lấy thông tin bài nộp của học sinh thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

/**
 * [PATCH/PUT] /api/v1/submissions/:id/grade
 * Giáo viên chấm điểm và nhận xét bài nộp
 */
const gradeSubmission = async (req, res, next) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;
    const updatedSubmission = await submissionService.gradeSubmission(
      submissionId,
      req.body,
      getRequestContext(req)
    );

    return successResponse(
      res,
      updatedSubmission,
      "Chấm điểm bài nộp thành công"
    );
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

module.exports = {
  submitAssignment,
  getSubmissionsByAssignment,
  getMySubmission,
  gradeSubmission,
};

