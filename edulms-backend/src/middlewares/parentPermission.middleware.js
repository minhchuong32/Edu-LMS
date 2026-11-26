const mongoose = require("mongoose");
const User = require("../models/User");
const { errorResponse } = require("../utils/apiResponse");

const READ_ONLY_HTTP_METHODS = ["GET", "HEAD", "OPTIONS"];
const WRITE_HTTP_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Middleware giới hạn quyền ghi đối với tài khoản Phụ huynh (enforceParentReadOnly)
 * - Phụ huynh (role === 'parent') chỉ được phép thực hiện các API đọc dữ liệu (GET, HEAD, OPTIONS).
 * - Từ chối toàn bộ các request ghi dữ liệu (POST, PUT, PATCH, DELETE) từ role 'parent' với mã HTTP 403.
 */
const enforceParentReadOnly = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
  }

  const method = String(req.method || "GET").toUpperCase();
  if (
    req.user.role === "parent" &&
    (WRITE_HTTP_METHODS.includes(method) ||
      !READ_ONLY_HTTP_METHODS.includes(method))
  ) {
    return errorResponse(
      res,
      "Tài khoản Phụ huynh chỉ có quyền xem dữ liệu (Read-only), không được phép thêm, sửa hoặc xóa dữ liệu!",
      403
    );
  }

  next();
};

/**
 * Middleware kiểm tra quyền truy cập dữ liệu học sinh của Phụ huynh dựa trên `role = 'parent'` và `childrenRefs`
 * - Nạp hồ sơ Phụ huynh và danh sách `childrenRefs` từ CSDL.
 * - Nếu request có chỉ định `studentId` (qua params hoặc query), bắt buộc `studentId` đó phải nằm trong `childrenRefs` của Phụ huynh.
 * - Nếu không nằm trong `childrenRefs`, từ chối ngay với mã HTTP 403.
 */
const verifyParentChildAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return errorResponse(res, "Chưa xác thực thông tin người dùng!", 401);
    }

    const { role, userId } = req.user;
    if (role !== "parent") {
      return errorResponse(
        res,
        "Chỉ tài khoản Phụ huynh mới có quyền truy cập cổng thông tin Phụ huynh!",
        403
      );
    }

    // Chặn mọi thao tác ghi dữ liệu từ role parent
    const method = String(req.method || "GET").toUpperCase();
    if (!READ_ONLY_HTTP_METHODS.includes(method)) {
      return errorResponse(
        res,
        "Tài khoản Phụ huynh chỉ có quyền xem dữ liệu (Read-only), không được phép thêm, sửa hoặc xóa dữ liệu!",
        403
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return errorResponse(res, "Mã tài khoản Phụ huynh không hợp lệ!", 400);
    }

    const parentQuery = User.findOne({
      _id: userId,
      role: "parent",
      isDeleted: { $ne: true },
    });
    const parentDoc =
      parentQuery && typeof parentQuery.select === "function"
        ? await parentQuery
            .select("_id fullName userCode email phone role childrenRefs")
            .lean()
        : await parentQuery;

    if (!parentDoc) {
      return errorResponse(
        res,
        "Không tìm thấy tài khoản Phụ huynh trong hệ thống!",
        404
      );
    }

    const childrenIdStrings = Array.isArray(parentDoc.childrenRefs)
      ? parentDoc.childrenRefs
          .map((c) => (c?._id || c)?.toString())
          .filter(Boolean)
      : [];

    req.parentAccount = parentDoc;
    req.authorizedChildrenIds = childrenIdStrings;

    // Nếu endpoint có yêu cầu truy cập một học sinh cụ thể (studentId)
    const targetStudentId =
      req.params?.studentId ||
      req.query?.studentId ||
      req.query?.student ||
      null;

    if (targetStudentId) {
      if (!mongoose.Types.ObjectId.isValid(targetStudentId)) {
        return errorResponse(res, "Mã học sinh (studentId) không hợp lệ!", 400);
      }

      if (!childrenIdStrings.includes(targetStudentId.toString())) {
        return errorResponse(
          res,
          "Bạn không có quyền xem dữ liệu của học sinh không nằm trong danh sách con được liên kết (childrenRefs)!",
          403
        );
      }

      req.targetChildId = targetStudentId.toString();
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enforceParentReadOnly,
  verifyParentChildAccess,
};

