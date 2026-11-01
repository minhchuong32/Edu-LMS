import { describe, it, expect } from 'vitest'
import {
  calculateSubjectGPA,
  calculateOverallGPA,
} from '@/utils/gradeCalculator'

describe('gradeCalculator utils', () => {
  describe('calculateSubjectGPA', () => {
    it('tính chính xác điểm TBM theo hệ số 1, 2, 3', () => {
      // HS1: [8, 9] (sum 17 * 1 = 17)
      // HS2: [7] (sum 7 * 2 = 14)
      // HS3: [8] (sum 8 * 3 = 24)
      // Total score = 55, total coeff = 7 -> 7.9
      const gpa = calculateSubjectGPA([8, 9], [7], [8])
      expect(gpa).toBe(7.9)
    });

    it('trả về null nếu không có điểm nào', () => {
      expect(calculateSubjectGPA([], [], [])).toBeNull()
      expect(calculateSubjectGPA([null], [undefined], [''])).toBeNull()
    })
  })

  describe('calculateOverallGPA', () => {
    it('tính điểm trung bình tất cả môn học có kèm trọng số', () => {
      const subjects = [
        { gpa: 8.0, weight: 2 },
        { gpa: 7.0, weight: 1 },
      ]
      // (8.0*2 + 7.0*1) / 3 = 23 / 3 = 7.666 -> 7.7
      expect(calculateOverallGPA(subjects)).toBe(7.7)
    })

    it('trả về null nếu danh sách môn rỗng', () => {
      expect(calculateOverallGPA([])).toBeNull()
    })
  })
})
