/**
 * Service xử lý logic nghiệp vụ tính toán điểm số & xếp loại học tập
 */

/**
 * Tính điểm Trung bình môn (TBM) theo hệ số 1, hệ số 2, hệ số 3
 * @param {Array<number>} coeff1 Danh sách điểm hệ số 1 (Miệng/15 phút)
 * @param {Array<number>} coeff2 Danh sách điểm hệ số 2 (1 Tiết/Giữa kỳ)
 * @param {Array<number>} coeff3 Danh sách điểm hệ số 3 (Thi cuối kỳ)
 * @returns {number|null} Điểm TBM làm tròn 1 chữ số thập phân
 */
const calculateSubjectGPA = (coeff1 = [], coeff2 = [], coeff3 = []) => {
  const valid1 = coeff1.filter((score) => typeof score === "number" && !isNaN(score));
  const valid2 = coeff2.filter((score) => typeof score === "number" && !isNaN(score));
  const valid3 = coeff3.filter((score) => typeof score === "number" && !isNaN(score));

  const sum1 = valid1.reduce((acc, val) => acc + val, 0);
  const sum2 = valid2.reduce((acc, val) => acc + val, 0);
  const sum3 = valid3.reduce((acc, val) => acc + val, 0);

  const totalCoefficients = valid1.length * 1 + valid2.length * 2 + valid3.length * 3;

  if (totalCoefficients === 0) return null;

  const rawGpa = (sum1 * 1 + sum2 * 2 + sum3 * 3) / totalCoefficients;
  return Math.round(rawGpa * 10) / 10;
};

/**
 * Tính Điểm trung bình chung tích lũy (Overall GPA)
 * @param {Array<{ subjectName: string, gpa: number, weight?: number }>} subjects
 * @returns {number|null}
 */
const calculateOverallGPA = (subjects = []) => {
  const validSubjects = subjects.filter(
    (sub) => typeof sub.gpa === "number" && !isNaN(sub.gpa)
  );

  if (validSubjects.length === 0) return null;

  const totalWeightedSum = validSubjects.reduce((acc, sub) => {
    const weight = sub.weight || 1;
    return acc + sub.gpa * weight;
  }, 0);

  const totalWeights = validSubjects.reduce((acc, sub) => acc + (sub.weight || 1), 0);

  const overallGpa = totalWeightedSum / totalWeights;
  return Math.round(overallGpa * 10) / 10;
};

/**
 * Xếp loại học lực theo điểm trung bình tổng kết chuẩn Bộ GD&ĐT THPT
 * @param {number} gpa Điểm tổng kết hệ 10
 * @returns {string} 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu' | 'Kém'
 */
const classifyAcademicPerformance = (gpa) => {
  if (typeof gpa !== "number" || isNaN(gpa)) return "Chưa xếp loại";
  if (gpa >= 9.0) return "Xuất sắc";
  if (gpa >= 8.0) return "Giỏi";
  if (gpa >= 6.5) return "Khá";
  if (gpa >= 5.0) return "Trung bình";
  if (gpa >= 3.5) return "Yếu";
  return "Kém";
};

module.exports = {
  calculateSubjectGPA,
  calculateOverallGPA,
  classifyAcademicPerformance,
};
