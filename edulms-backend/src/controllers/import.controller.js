const { processImport } = require("../services/import.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

/**
 * POST /api/v1/admin/import/:role
 * Import danh sách học sinh hoặc giáo viên từ file Excel
 * @param {string} req.params.role - 'student' | 'teacher'
 */
const importUsers = async (req, res, next) => {
  try {
    const { role } = req.params;

    if (!["student", "teacher"].includes(role)) {
      return errorResponse(
        res,
        "Vai trò không hợp lệ. Chỉ hỗ trợ 'student' hoặc 'teacher'",
        400
      );
    }

    if (!req.file) {
      return errorResponse(res, "Vui lòng tải lên file Excel (.xlsx)", 400);
    }

    const result = await processImport(req.file.buffer, role);

    const roleLabel = role === "student" ? "Học sinh" : "Giáo viên";

    return successResponse(
      res,
      result,
      `Import ${roleLabel}: ${result.successCount}/${result.totalRows} tài khoản thành công`,
      200
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importUsers,
};
