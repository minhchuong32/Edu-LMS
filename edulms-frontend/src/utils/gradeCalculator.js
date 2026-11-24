/**
 * Bộ công cụ tính điểm học tập chuẩn THPT Việt Nam (hỗ trợ cấu hình hệ số động)
 * Công thức tổng quát: TBM = Tổng(Điểm_i * Hệ_số_i) / Tổng(Hệ_số_i)
 */

export const DEFAULT_GRADE_WEIGHTS = Object.freeze({
  oral: 1,
  '15min': 1,
  regular: 1,
  '45min': 2,
  midterm: 2,
  final: 3,
})

export const GRADE_COLUMN_DEFINITIONS = Object.freeze([
  {
    key: 'oral',
    label: 'Điểm miệng',
    shortLabel: 'Miệng',
    defaultWeight: 1,
  },
  {
    key: '15min',
    label: 'Điểm 15 phút',
    shortLabel: '15 phút',
    defaultWeight: 1,
  },
  {
    key: 'regular',
    label: 'Điểm thường xuyên',
    shortLabel: 'Thường xuyên',
    defaultWeight: 1,
  },
  {
    key: '45min',
    label: 'Điểm 1 tiết',
    shortLabel: '1 tiết',
    defaultWeight: 2,
  },
  {
    key: 'midterm',
    label: 'Điểm giữa kỳ',
    shortLabel: 'Giữa kỳ',
    defaultWeight: 2,
  },
  {
    key: 'final',
    label: 'Điểm cuối kỳ',
    shortLabel: 'Cuối kỳ',
    defaultWeight: 3,
  },
])

/**
 * Kiểm tra giá trị ô nhập điểm có nằm trong khoảng hợp lệ 0 - 10 hay không
 * @param {string|number|null|undefined} rawVal
 * @returns {{ isEmpty: boolean, isValid: boolean, numericValue: number|null, error: string|null }}
 */
export const validateGradeInput = (rawVal) => {
  if (rawVal === null || rawVal === undefined) {
    return { isEmpty: true, isValid: true, numericValue: null, error: null }
  }

  const trimmed = String(rawVal).trim().replace(',', '.')
  if (trimmed === '') {
    return { isEmpty: true, isValid: true, numericValue: null, error: null }
  }

  const num = Number(trimmed)
  if (
    typeof rawVal === 'boolean' ||
    Number.isNaN(num) ||
    !Number.isFinite(num)
  ) {
    return {
      isEmpty: false,
      isValid: false,
      numericValue: null,
      error: 'Điểm phải là số hợp lệ từ 0 đến 10',
    }
  }

  if (num < 0 || num > 10) {
    return {
      isEmpty: false,
      isValid: false,
      numericValue: null,
      error: 'Điểm phải nằm trong khoảng từ 0 đến 10',
    }
  }

  return {
    isEmpty: false,
    isValid: true,
    numericValue: Math.round(num * 100) / 100,
    error: null,
  }
}

/**
 * Tính điểm trung bình môn (TBM) cho một hàng học sinh trên bảng điểm dựa theo cấu hình hệ số
 * @param {Record<string, string|number|{ value: string|number }>} rowCells - Map { [gradeType]: value }
 * @param {Record<string, number>} [weightConfig=DEFAULT_GRADE_WEIGHTS]
 * @returns {number|null}
 */
export const calculateRowWeightedAverage = (
  rowCells = {},
  weightConfig = DEFAULT_GRADE_WEIGHTS
) => {
  if (!rowCells || typeof rowCells !== 'object') return null

  const weights = {
    ...DEFAULT_GRADE_WEIGHTS,
    ...(weightConfig || {}),
  }

  let totalWeightedScore = 0
  let totalWeight = 0

  for (const [gradeType, cellOrVal] of Object.entries(rowCells)) {
    const rawVal =
      cellOrVal && typeof cellOrVal === 'object' ? cellOrVal.value : cellOrVal
    const check = validateGradeInput(rawVal)
    if (check.isEmpty || !check.isValid || check.numericValue === null) {
      continue
    }

    const w = Number(weights[gradeType]) || 1
    if (w <= 0) continue

    totalWeightedScore += check.numericValue * w
    totalWeight += w
  }

  if (totalWeight === 0) return null
  return Math.round((totalWeightedScore / totalWeight) * 10) / 10
}

/**
 * Xếp loại học lực theo điểm trung bình môn chuẩn THPT
 * @param {number|null} gpa
 * @returns {string}
 */
export const classifyAcademicPerformance = (gpa) => {
  if (typeof gpa !== 'number' || Number.isNaN(gpa)) return 'Chưa xếp loại'
  if (gpa >= 9.0) return 'Xuất sắc'
  if (gpa >= 8.0) return 'Giỏi'
  if (gpa >= 6.5) return 'Khá'
  if (gpa >= 5.0) return 'Trung bình'
  if (gpa >= 3.5) return 'Yếu'
  return 'Kém'
}

/**
 * Tính điểm trung bình môn (TBM) từ các danh sách điểm theo hệ số 1, 2, 3
 * @param {Array<number>} coeff1List Danh sách điểm hệ số 1 (Miệng, 15p)
 * @param {Array<number>} coeff2List Danh sách điểm hệ số 2 (1 tiết, giữa kỳ)
 * @param {Array<number>} coeff3List Danh sách điểm hệ số 3 (Cuối kỳ)
 * @param {{ coeff1?: number, coeff2?: number, coeff3?: number }} [weights={}]
 * @returns {number|null} Điểm TBM đã làm tròn 1 chữ số thập phân
 */
export const calculateSubjectGPA = (
  coeff1List = [],
  coeff2List = [],
  coeff3List = [],
  weights = {}
) => {
  const w1 = Number(weights.coeff1) || 1
  const w2 = Number(weights.coeff2) || 2
  const w3 = Number(weights.coeff3) || 3

  const sum1 = coeff1List.reduce(
    (acc, score) => acc + (parseFloat(score) || 0),
    0
  )
  const count1 = coeff1List.filter(
    (s) => s !== null && s !== undefined && s !== '' && !Number.isNaN(Number(s))
  ).length

  const sum2 = coeff2List.reduce(
    (acc, score) => acc + (parseFloat(score) || 0),
    0
  )
  const count2 = coeff2List.filter(
    (s) => s !== null && s !== undefined && s !== '' && !Number.isNaN(Number(s))
  ).length

  const sum3 = coeff3List.reduce(
    (acc, score) => acc + (parseFloat(score) || 0),
    0
  )
  const count3 = coeff3List.filter(
    (s) => s !== null && s !== undefined && s !== '' && !Number.isNaN(Number(s))
  ).length

  const totalWeightedSum = sum1 * w1 + sum2 * w2 + sum3 * w3
  const totalCoefficients = count1 * w1 + count2 * w2 + count3 * w3

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
  const validSubjects = subjectList.filter(
    (sub) =>
      sub.gpa !== null && sub.gpa !== undefined && !Number.isNaN(sub.gpa)
  )
  if (validSubjects.length === 0) return null

  const totalSum = validSubjects.reduce((acc, sub) => {
    const weight = sub.weight || 1
    return acc + sub.gpa * weight
  }, 0)

  const totalWeights = validSubjects.reduce(
    (acc, sub) => acc + (sub.weight || 1),
    0
  )

  const overallGpa = totalSum / totalWeights
  return Math.round(overallGpa * 10) / 10
}
