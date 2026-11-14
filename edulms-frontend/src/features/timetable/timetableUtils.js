/**
 * Cấu hình 10 tiết học chuẩn trong hệ thống trường THPT
 * Buổi sáng: Tiết 1 - 5
 * Buổi chiều: Tiết 6 - 10
 */
export const PERIODS_CONFIG = [
  { period: 1, name: 'Tiết 1', timeRange: '07:00 - 07:45', session: 'morning' },
  { period: 2, name: 'Tiết 2', timeRange: '07:50 - 08:35', session: 'morning' },
  { period: 3, name: 'Tiết 3', timeRange: '08:50 - 09:35', session: 'morning' },
  { period: 4, name: 'Tiết 4', timeRange: '09:40 - 10:25', session: 'morning' },
  { period: 5, name: 'Tiết 5', timeRange: '10:30 - 11:15', session: 'morning' },
  { period: 6, name: 'Tiết 6', timeRange: '13:00 - 13:45', session: 'afternoon' },
  { period: 7, name: 'Tiết 7', timeRange: '13:50 - 14:35', session: 'afternoon' },
  { period: 8, name: 'Tiết 8', timeRange: '14:50 - 15:35', session: 'afternoon' },
  { period: 9, name: 'Tiết 9', timeRange: '15:40 - 16:25', session: 'afternoon' },
  { period: 10, name: 'Tiết 10', timeRange: '16:30 - 17:15', session: 'afternoon' },
]

/**
 * Cấu hình 7 ngày trong tuần theo chuẩn giáo dục Việt Nam
 * Thứ Hai (2) -> Thứ Bảy (7) và Chủ Nhật (8)
 */
export const DAYS_OF_WEEK_CONFIG = [
  { dayOfWeek: 2, name: 'Thứ Hai', shortName: 'Thứ 2' },
  { dayOfWeek: 3, name: 'Thứ Ba', shortName: 'Thứ 3' },
  { dayOfWeek: 4, name: 'Thứ Tư', shortName: 'Thứ 4' },
  { dayOfWeek: 5, name: 'Thứ Năm', shortName: 'Thứ 5' },
  { dayOfWeek: 6, name: 'Thứ Sáu', shortName: 'Thứ 6' },
  { dayOfWeek: 7, name: 'Thứ Bảy', shortName: 'Thứ 7' },
  { dayOfWeek: 8, name: 'Chủ Nhật', shortName: 'Chủ Nhật' },
]

/**
 * Bảng màu sắc nhận diện trực quan theo môn học
 */
const SUBJECT_COLOR_MAP = {
  toan: {
    bg: 'bg-blue-50 hover:bg-blue-100/80',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-600 text-white',
    accent: 'text-blue-700',
  },
  van: {
    bg: 'bg-rose-50 hover:bg-rose-100/80',
    border: 'border-rose-200',
    text: 'text-rose-900',
    badge: 'bg-rose-600 text-white',
    accent: 'text-rose-700',
  },
  anh: {
    bg: 'bg-emerald-50 hover:bg-emerald-100/80',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    badge: 'bg-emerald-600 text-white',
    accent: 'text-emerald-700',
  },
  ly: {
    bg: 'bg-indigo-50 hover:bg-indigo-100/80',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    badge: 'bg-indigo-600 text-white',
    accent: 'text-indigo-700',
  },
  hoa: {
    bg: 'bg-amber-50 hover:bg-amber-100/80',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-white',
    accent: 'text-amber-700',
  },
  sinh: {
    bg: 'bg-teal-50 hover:bg-teal-100/80',
    border: 'border-teal-200',
    text: 'text-teal-900',
    badge: 'bg-teal-600 text-white',
    accent: 'text-teal-700',
  },
  su: {
    bg: 'bg-orange-50 hover:bg-orange-100/80',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-600 text-white',
    accent: 'text-orange-700',
  },
  dia: {
    bg: 'bg-cyan-50 hover:bg-cyan-100/80',
    border: 'border-cyan-200',
    text: 'text-cyan-900',
    badge: 'bg-cyan-600 text-white',
    accent: 'text-cyan-700',
  },
  tin: {
    bg: 'bg-sky-50 hover:bg-sky-100/80',
    border: 'border-sky-200',
    text: 'text-sky-900',
    badge: 'bg-sky-600 text-white',
    accent: 'text-sky-700',
  },
  gdcd: {
    bg: 'bg-purple-50 hover:bg-purple-100/80',
    border: 'border-purple-200',
    text: 'text-purple-900',
    badge: 'bg-purple-600 text-white',
    accent: 'text-purple-700',
  },
  theduc: {
    bg: 'bg-lime-50 hover:bg-lime-100/80',
    border: 'border-lime-200',
    text: 'text-lime-900',
    badge: 'bg-lime-700 text-white',
    accent: 'text-lime-800',
  },
}

/**
 * Trả về màu sắc đẹp mắt theo tên môn học hoặc mã môn học
 */
export const getSubjectColor = (subjectName = '', subjectCode = '') => {
  const normalized = (subjectName + ' ' + subjectCode)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('toan')) return SUBJECT_COLOR_MAP.toan
  if (normalized.includes('van') || normalized.includes('ngu van')) return SUBJECT_COLOR_MAP.van
  if (normalized.includes('anh') || normalized.includes('tieng anh')) return SUBJECT_COLOR_MAP.anh
  if (normalized.includes('vat ly') || normalized.includes('ly')) return SUBJECT_COLOR_MAP.ly
  if (normalized.includes('hoa')) return SUBJECT_COLOR_MAP.hoa
  if (normalized.includes('sinh')) return SUBJECT_COLOR_MAP.sinh
  if (normalized.includes('su') || normalized.includes('lich su')) return SUBJECT_COLOR_MAP.su
  if (normalized.includes('dia') || normalized.includes('dia ly')) return SUBJECT_COLOR_MAP.dia
  if (normalized.includes('tin') || normalized.includes('tin hoc')) return SUBJECT_COLOR_MAP.tin
  if (normalized.includes('gdcd') || normalized.includes('cong dan')) return SUBJECT_COLOR_MAP.gdcd
  if (normalized.includes('the duc') || normalized.includes('the chat')) return SUBJECT_COLOR_MAP.theduc

  // Màu mặc định hài hòa
  return {
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-800',
    badge: 'bg-slate-600 text-white',
    accent: 'text-slate-700',
  }
}

/**
 * Tính toán các ngày trong tuần (từ Thứ Hai đến Chủ Nhật) dựa trên một ngày mốc
 */
export const getWeekRange = (currentDate = new Date()) => {
  const d = new Date(currentDate)
  // Trong JS: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayIndex = d.getDay()
  // Khoảng cách ngày lùi về Thứ Hai (1)
  const diffToMonday = dayIndex === 0 ? -6 : 1 - dayIndex

  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const today = new Date()

  // Tạo danh sách 7 ngày
  const days = DAYS_OF_WEEK_CONFIG.map((dayConfig, index) => {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + index)

    const isToday =
      dayDate.getDate() === today.getDate() &&
      dayDate.getMonth() === today.getMonth() &&
      dayDate.getFullYear() === today.getFullYear()

    const dayNum = String(dayDate.getDate()).padStart(2, '0')
    const monthNum = String(dayDate.getMonth() + 1).padStart(2, '0')

    return {
      ...dayConfig,
      date: dayDate,
      formattedDate: `${dayNum}/${monthNum}`,
      fullDateStr: `${dayNum}/${monthNum}/${dayDate.getFullYear()}`,
      isToday,
    }
  })

  // Định dạng hiển thị chuỗi tuần: "16/11/2026 - 22/11/2026"
  const startDay = String(monday.getDate()).padStart(2, '0')
  const startMonth = String(monday.getMonth() + 1).padStart(2, '0')
  const startYear = monday.getFullYear()

  const endDay = String(sunday.getDate()).padStart(2, '0')
  const endMonth = String(sunday.getMonth() + 1).padStart(2, '0')
  const endYear = sunday.getFullYear()

  const weekRangeText = `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`

  return {
    monday,
    sunday,
    days,
    weekRangeText,
  }
}

/**
 * Gom nhóm danh sách slots thành lưới [dayOfWeek][period]
 */
export const groupSlotsToGrid = (slots = []) => {
  const grid = {}
  DAYS_OF_WEEK_CONFIG.forEach((d) => {
    grid[d.dayOfWeek] = {}
    for (let p = 1; p <= 10; p++) {
      grid[d.dayOfWeek][p] = null
    }
  })

  if (!Array.isArray(slots)) return grid

  slots.forEach((slot) => {
    const day = Number(slot.dayOfWeek)
    const period = Number(slot.period)
    if (grid[day] && period >= 1 && period <= 10) {
      grid[day][period] = slot
    }
  })

  return grid
}
