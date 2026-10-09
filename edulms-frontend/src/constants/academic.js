/**
 * Các hằng số quản lý đào tạo & học tập hệ THPT
 */

// Danh sách khối lớp hệ THPT
export const GRADE_LEVELS = [
  { value: 10, label: 'Khối 10' },
  { value: 11, label: 'Khối 11' },
  { value: 12, label: 'Khối 12' },
]

// Học kỳ trong năm học
export const SEMESTERS = [
  { value: 1, label: 'Học kỳ I' },
  { value: 2, label: 'Học kỳ II' },
]

// Hệ số điểm số chuẩn Bộ Giáo dục & Đào tạo Việt Nam
export const GRADE_COEFFICIENTS = {
  COEFF_1: { value: 1, label: 'Hệ số 1 (Miệng / 15 phút)' },
  COEFF_2: { value: 2, label: 'Hệ số 2 (1 Tiết / Kiểm tra giữa kỳ)' },
  COEFF_3: { value: 3, label: 'Hệ số 3 (Thi cuối kỳ)' },
}

// Xếp loại Hạnh kiểm
export const CONDUCT_TYPES = {
  GOOD: 'Tốt',
  FAIR: 'Khá',
  AVERAGE: 'Trung bình',
  POOR: 'Yếu',
}

// Trạng thái điểm danh tiết học (Tiết 1 - Tiết 10)
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  EXCUSED: 'excused',
  UNEXCUSED: 'unexcused',
  LATE: 'late',
}

export const ATTENDANCE_LABELS = {
  [ATTENDANCE_STATUS.PRESENT]: 'Có mặt',
  [ATTENDANCE_STATUS.EXCUSED]: 'Nghỉ có phép',
  [ATTENDANCE_STATUS.UNEXCUSED]: 'Vắng không phép',
  [ATTENDANCE_STATUS.LATE]: 'Đi trễ',
}
