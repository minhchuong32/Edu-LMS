import { describe, it, expect } from 'vitest'
import {
  calculateSubjectGPA,
  calculateOverallGPA,
  validateGradeInput,
  calculateRowWeightedAverage,
  classifyAcademicPerformance,
} from '@/utils/gradeCalculator'

describe('gradeCalculator utils', () => {
  describe('calculateSubjectGPA', () => {
    it('tính chính xác điểm TBM theo hệ số 1, 2, 3', () => {
      const gpa = calculateSubjectGPA([8, 9], [7], [8])
      expect(gpa).toBe(7.9)
    })

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
      expect(calculateOverallGPA(subjects)).toBe(7.7)
    })

    it('trả về null nếu danh sách môn rỗng', () => {
      expect(calculateOverallGPA([])).toBeNull()
    })
  })

  describe('validateGradeInput & calculateRowWeightedAverage', () => {
    it('validateGradeInput kiểm tra điểm trong khoảng 0 - 10', () => {
      expect(validateGradeInput('').isEmpty).toBe(true)
      expect(validateGradeInput('8.5')).toEqual({
        isEmpty: false,
        isValid: true,
        numericValue: 8.5,
        error: null,
      })
      expect(validateGradeInput('-1').isValid).toBe(false)
      expect(validateGradeInput('10.5').isValid).toBe(false)
      expect(validateGradeInput('abc').isValid).toBe(false)
    })

    it('calculateRowWeightedAverage tính điểm trung bình hàng học sinh theo hệ số cấu hình', () => {
      const cells = {
        oral: '8',
        '15min': '9',
        midterm: '7',
        final: '8',
      }
      expect(calculateRowWeightedAverage(cells)).toBe(7.9)
      expect(classifyAcademicPerformance(7.9)).toBe('Khá')
    })
  })
})
