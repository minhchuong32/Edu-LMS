/**
 * Middleware xử lý route không tồn tại (404 Not Found)
 */
const notFound = (req, res, next) => {
  const error = new Error(`API endpoint không tồn tại - [${req.method}] ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Middleware xử lý lỗi tập trung toàn ứng dụng (Global Error Handler)
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Lỗi máy chủ nội bộ!";

  // Lỗi Mongoose CastError (Sai ObjectID)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = "Dữ liệu định dạng ID không hợp lệ!";
  }

  // Lỗi Mongoose trùng lặp trường unique (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Giá trị của trường '${field}' đã tồn tại trong hệ thống!`;
  }

  // Lỗi Mongoose ValidationError
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
