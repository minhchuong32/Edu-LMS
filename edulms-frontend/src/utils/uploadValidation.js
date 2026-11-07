/**
 * Định nghĩa quy tắc giới hạn định dạng và dung lượng upload tệp
 * Đồng bộ chính xác với backend src/config/fileTypes.js
 */

export const MB = 1024 * 1024

export const UPLOAD_RULES = {
  document: {
    category: 'document',
    label: 'Tài liệu văn bản (PDF, DOC, DOCX, TXT, RTF)',
    maxSize: 10 * MB,
    maxSizeLabel: '10 MB',
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'text/rtf',
    ],
  },
  spreadsheet: {
    category: 'spreadsheet',
    label: 'Bảng tính (XLS, XLSX, CSV)',
    maxSize: 10 * MB,
    maxSizeLabel: '10 MB',
    extensions: ['.xls', '.xlsx', '.csv'],
    mimes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
      'text/plain',
    ],
  },
  presentation: {
    category: 'presentation',
    label: 'Bài trình chiếu (PPT, PPTX)',
    maxSize: 10 * MB,
    maxSizeLabel: '10 MB',
    extensions: ['.ppt', '.pptx'],
    mimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  archive: {
    category: 'archive',
    label: 'File nén (ZIP, RAR, 7Z)',
    maxSize: 20 * MB,
    maxSizeLabel: '20 MB',
    extensions: ['.zip', '.rar', '.7z'],
    mimes: [
      'application/zip',
      'application/x-zip-compressed',
      'application/vnd.rar',
      'application/x-rar-compressed',
      'application/x-rar',
      'application/x-7z-compressed',
      'application/octet-stream',
    ],
  },
  image: {
    category: 'image',
    label: 'Hình ảnh (JPG, JPEG, PNG, WEBP)',
    maxSize: 5 * MB,
    maxSizeLabel: '5 MB',
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  video: {
    category: 'video',
    label: 'Video bài giảng (MP4, MOV, WEBM)',
    maxSize: 30 * MB,
    maxSizeLabel: '30 MB',
    extensions: ['.mp4', '.mov', '.webm'],
    mimes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
}

/**
 * Tra cứu thông tin quy tắc theo phần mở rộng của file
 * @param {string} filename
 * @returns {Object|null}
 */
export const getFileRule = (filename) => {
  if (!filename) return null
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return null
  const ext = filename.slice(dotIndex).toLowerCase()

  for (const rule of Object.values(UPLOAD_RULES)) {
    if (rule.extensions.includes(ext)) {
      return { ...rule, ext }
    }
  }
  return null
}

/**
 * Kiểm tra tính hợp lệ của file trước khi gửi lên server
 * @param {File} file
 * @returns {{ valid: boolean, error?: string, rule?: Object }}
 */
export const validateUploadFile = (file) => {
  if (!file) {
    return { valid: false, error: 'Tập tin không tồn tại' }
  }

  const rule = getFileRule(file.name)
  if (!rule) {
    return {
      valid: false,
      error: `Định dạng tập tin '${file.name}' không được hỗ trợ. Các định dạng cho phép: PDF, DOC, DOCX, XLS, XLSX, CSV, PPT, PPTX, ZIP, RAR, 7Z, JPG, PNG, WEBP, MP4, MOV, WEBM.`,
    }
  }

  if (file.size > rule.maxSize) {
    return {
      valid: false,
      error: `Dung lượng tệp '${file.name}' (${(file.size / MB).toFixed(1)}MB) vượt quá giới hạn tối đa cho phép (${rule.maxSizeLabel}).`,
      rule,
    }
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: `Tập tin '${file.name}' rỗng (0 bytes). Vui lòng chọn tệp tin hợp lệ.`,
      rule,
    }
  }

  return { valid: true, rule }
}

/**
 * Định dạng dung lượng byte thành chuỗi dễ đọc
 * @param {number} bytes
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

