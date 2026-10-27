import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatGrade,
  getAcademicClassification,
  formatCurrency,
} from '@/utils/formatters'

describe('formatters utils', () => {
  describe('formatDate', () => {
    it('định dạng ngày tháng chuẩn DD/MM/YYYY', () => {
      const date = new Date(2026, 4, 15) // May 15, 2026
      expect(formatDate(date)).toBe('15/05/2026')
    })

    it('trả về N/A khi ngày không hợp lệ hoặc rỗng', () => {
      expect(formatDate(null)).toBe('N/A')
      expect(formatDate('invalid-date')).toBe('N/A')
    })

    it('định dạng kèm giờ phút khi includeTime = true', () => {
      const date = new Date(2026, 4, 15, 8, 30)
      expect(formatDate(date, true)).toBe('08:30 15/05/2026')
    })
  })

  describe('formatGrade', () => {
    it('làm tròn 1 chữ số thập phân', () => {
      expect(formatGrade(8.46)).toBe('8.5')
      expect(formatGrade(9)).toBe('9.0')
    })

    it('trả về dấu - nếu điểm không hợp lệ', () => {
      expect(formatGrade(null)).toBe('-')
      expect(formatGrade('abc')).toBe('-')
    })
  })

  describe('getAcademicClassification', () => {
    it('phân loại học lực đúng chuẩn THPT kèm badge class', () => {
      expect(getAcademicClassification(9.2).label).toBe('Xuất sắc')
      expect(getAcademicClassification(8.0).label).toBe('Giỏi')
      expect(getAcademicClassification(6.8).label).toBe('Khá')
      expect(getAcademicClassification(5.5).label).toBe('Trung bình')
      expect(getAcademicClassification(3.8).label).toBe('Yếu')
      expect(getAcademicClassification(2.5).label).toBe('Kém')
      expect(getAcademicClassification('abc').label).toBe('Chưa xếp loại')
    })
  })

  describe('formatCurrency', () => {
    it('định dạng tiền tệ theo chuẩn VND', () => {
      const formatted = formatCurrency(500000)
      expect(formatted).toMatch(/500\.000/);
      expect(formatCurrency(null)).toBe('0 ₫')
    })
  })
})
