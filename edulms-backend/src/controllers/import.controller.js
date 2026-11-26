const { processImport, generateTemplate } = require("../services/import.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");

const SUPPORTED_IMPORT_ROLES = ["student", "teacher", "parent"];

const ROLE_LABELS = {
  student: "Học sinh",
  teacher: "Giáo viên",
  parent: "Phụ huynh",
};

/**
 * POST /api/v1/admin/import/:role
 * Import danh sách học sinh, giáo viên hoặc phụ huynh từ file Excel
 * @param {string} req.params.role - 'student' | 'teacher' | 'parent'
 */
const importUsers = async (req, res, next) => {
  try {
    const { role } = req.params;

    if (!SUPPORTED_IMPORT_ROLES.includes(role)) {
      return errorResponse(
        res,
        "Vai trò không hợp lệ. Chỉ hỗ trợ 'student', 'teacher' hoặc 'parent'",
        400
      );
    }

    if (!req.file) {
      return errorResponse(res, "Vui lòng tải lên file Excel (.xlsx)", 400);
    }

    const result = await processImport(req.file.buffer, role);
    const roleLabel = ROLE_LABELS[role] || "Người dùng";

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

/**
 * GET /api/v1/admin/import/template/:role
 * Tải file Excel mẫu chuẩn (.xlsx) cho học sinh, giáo viên hoặc phụ huynh
 * @param {string} req.params.role - 'student' | 'teacher' | 'parent'
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const { role } = req.params;

    if (!SUPPORTED_IMPORT_ROLES.includes(role)) {
      return errorResponse(
        res,
        "Vai trò không hợp lệ. Chỉ hỗ trợ 'student', 'teacher' hoặc 'parent'",
        400
      );
    }

    const buffer = await generateTemplate(role);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=mau_import_${role}.xlsx`
    );

    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importUsers,
  downloadTemplate,
};
