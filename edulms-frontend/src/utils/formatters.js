/**
 * Định dạng ngày tháng năm theo chuẩn Việt Nam (DD/MM/YYYY)
 * @param {string|Date} dateInput
 * @param {boolean} includeTime Có bao gồm giờ phút không
 * @returns {string}
 */
export const formatDate = (dateInput, includeTime = false) => {
  if (!dateInput) return 'N/A'
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return 'N/A'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  if (includeTime) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes} ${day}/${month}/${year}`
  }

  return `${day}/${month}/${year}`
}

/**
 * Định dạng điểm số hệ 10 làm tròn 1 chữ số thập phân (VD: 8.5)
 * @param {number|string} score
 * @returns {string}
 */
export const formatGrade = (score) => {
  if (score === null || score === undefined || score === '') return '-'
  const num = parseFloat(score)
  if (isNaN(num)) return '-'
  return num.toFixed(1)
}

/**
 * Xếp loại học lực theo điểm trung bình (GPA) chuẩn Bộ GD&ĐT THPT
 * @param {number} gpa Điểm trung bình tích lũy hệ 10
 * @returns {object} { label, badgeClass }
 */
export const getAcademicClassification = (gpa) => {
  const score = parseFloat(gpa)
  if (isNaN(score)) return { label: 'Chưa xếp loại', badgeClass: 'bg-gray-100 text-gray-600' }

  if (score >= 9.0) return { label: 'Xuất sắc', badgeClass: 'bg-purple-100 text-purple-700 font-semibold' }
  if (score >= 8.0) return { label: 'Giỏi', badgeClass: 'bg-emerald-100 text-emerald-700 font-semibold' }
  if (score >= 6.5) return { label: 'Khá', badgeClass: 'bg-blue-100 text-blue-700 font-semibold' }
  if (score >= 5.0) return { label: 'Trung bình', badgeClass: 'bg-amber-100 text-amber-700 font-semibold' }
  if (score >= 3.5) return { label: 'Yếu', badgeClass: 'bg-orange-100 text-orange-700 font-semibold' }
  return { label: 'Kém', badgeClass: 'bg-red-100 text-red-700 font-semibold' }
}

/**
 * Định dạng tiền tệ VND (nếu có học phí / bảo hiểm)
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '0 ₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
