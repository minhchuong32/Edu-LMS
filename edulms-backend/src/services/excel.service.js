/**
 * Service xử lý Import / Export dữ liệu danh sách lớp & bảng điểm qua tập tin Excel (.xlsx)
 */

/**
 * Xử lý dữ liệu bảng điểm học sinh để xuất báo cáo
 * @param {string} className Tên lớp học
 * @param {Array<object>} studentGrades Danh sách điểm học sinh
 * @returns {object} Cấu trúc dữ liệu sẵn sàng xuất Excel
 */
const prepareGradebookExportData = (className, studentGrades = []) => {
  const formattedRows = studentGrades.map((item, index) => ({
    stt: index + 1,
    studentCode: item.studentCode || "N/A",
    fullName: item.fullName || "N/A",
    coeff1: item.coeff1 ? item.coeff1.join(", ") : "",
    coeff2: item.coeff2 ? item.coeff2.join(", ") : "",
    coeff3: item.coeff3 !== undefined ? item.coeff3 : "",
    gpa: item.gpa !== undefined ? item.gpa : "",
    conduct: item.conduct || "Tốt",
  }));

  return {
    sheetName: `Bảng điểm lớp ${className}`,
    totalStudents: studentGrades.length,
    rows: formattedRows,
  };
};

/**
 * Xử lý đọc & parse dữ liệu danh sách học sinh nhập từ file Excel
 * @param {Array<object>} rawExcelRows Dữ liệu thô từ file đính kèm
 * @returns {Array<object>} Dữ liệu học sinh đã chuẩn hóa
 */
const parseStudentImportData = (rawExcelRows = []) => {
  return rawExcelRows.map((row) => ({
    studentCode: String(row["Mã Học Sinh"] || row.studentCode || "").trim(),
    fullName: String(row["Họ và Tên"] || row.fullName || "").trim(),
    gender: String(row["Giới tính"] || row.gender || "Nam").trim(),
    dateOfBirth: row["Ngày sinh"] || row.dateOfBirth || null,
    parentPhone: String(row["Số điện thoại PH"] || row.parentPhone || "").trim(),
  }));
};

module.exports = {
  prepareGradebookExportData,
  parseStudentImportData,
};
