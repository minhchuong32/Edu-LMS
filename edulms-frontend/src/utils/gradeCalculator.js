/**
 * Bộ công cụ tính điểm học tập chuẩn THPT Việt Nam
 * Công thức: TBM = (Tổng HS1 + Tổng HS2 * 2 + Tổng HS3 * 3) / Tổng hệ số
 */

/**
 * Tính điểm trung bình môn (TBM) từ các danh sách điểm theo hệ số
 * @param {Array<number>} coeff1List Danh sách điểm hệ số 1 (Miệng, 15p)
 * @param {Array<number>} coeff2List Danh sách điểm hệ số 2 (1 tiết, giữa kỳ)
 * @param {Array<number>} coeff3List Danh sách điểm hệ số 3 (Cuối kỳ)
 * @returns {number|null} Điểm TBM đã làm tròn 1 chữ số thập phân
 */
export const calculateSubjectGPA = (coeff1List = [], coeff2List = [], coeff3List = []) => {
  const sum1 = coeff1List.reduce((acc, score) => acc + (parseFloat(score) || 0), 0)
  const count1 = coeff1List.filter((s) => s !== null && s !== undefined && s !== '').length

  const sum2 = coeff2List.reduce((acc, score) => acc + (parseFloat(score) || 0), 0)
  const count2 = coeff2List.filter((s) => s !== null && s !== undefined && s !== '').length

  const sum3 = coeff3List.reduce((acc, score) => acc + (parseFloat(score) || 0), 0)
  const count3 = coeff3List.filter((s) => s !== null && s !== undefined && s !== '').length

  const totalWeightedSum = sum1 * 1 + sum2 * 2 + sum3 * 3
  const totalCoefficients = count1 * 1 + count2 * 2 + count3 * 3

  if (totalCoefficients === 0) return null

  const gpa = totalWeightedSum / totalCoefficients
  return Math.round(gpa * 10) / 10
}

/**
 * Tính Điểm Trung Bình Chung (GPA) của tất cả môn học
 * @param {Array<{ gpa: number, weight?: number }>} subjectList
 * @returns {number|null}
 */
export const calculateOverallGPA = (subjectList = []) => {
  const validSubjects = subjectList.filter((sub) => sub.gpa !== null && sub.gpa !== undefined && !isNaN(sub.gpa))
  if (validSubjects.length === 0) return null

  const totalSum = validSubjects.reduce((acc, sub) => {
    const weight = sub.weight || 1
    return acc + sub.gpa * weight
  }, 0)

  const totalWeights = validSubjects.reduce((acc, sub) => acc + (sub.weight || 1), 0)

  const overallGpa = totalSum / totalWeights
  return Math.round(overallGpa * 10) / 10
}
