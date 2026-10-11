/**
 * Trả về phản hồi thành công chuẩn (Standardized Success Response)
 */
const successResponse = (res, data = null, message = "Thao tác thành công", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Trả về phản hồi thất bại chuẩn (Standardized Error Response)
 */
const errorResponse = (res, message = "Thao tác thất bại", statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message,
  };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse,
};
