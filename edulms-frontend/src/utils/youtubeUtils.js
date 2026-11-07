/**
 * Tiện ích xử lý URL YouTube (YouTube Video Utilities)
 * Phục vụ chức năng Nhúng video YouTube bài giảng - Dự án Edu-LMS
 */

export const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
])

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{3,30}$/
export const BARE_YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

/**
 * Trích xuất YouTube Video ID từ chuỗi URL hoặc Video ID trực tiếp
 * @param {string} rawUrl
 * @returns {string|null}
 */
export const extractYouTubeVideoId = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null
  }

  const trimmed = rawUrl.trim()

  // Chống XSS, dán iframe hoặc script injection
  if (
    trimmed.includes('<') ||
    trimmed.includes('>') ||
    trimmed.toLowerCase().includes('javascript:') ||
    trimmed.toLowerCase().includes('<iframe')
  ) {
    return null
  }

  // Trường hợp người dùng nhập trực tiếp Video ID (11 ký tự chuẩn, không có dấu / hoặc .)
  if (!trimmed.includes('/') && !trimmed.includes('.') && BARE_YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed
  }

  try {
    const urlString = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const parsed = new URL(urlString)
    const hostname = parsed.hostname.toLowerCase()

    if (!ALLOWED_YOUTUBE_HOSTS.has(hostname)) {
      return null
    }

    let candidateId = null

    if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
      const pathname = parsed.pathname.replace(/^\/+/, '')
      candidateId = pathname.split('/')[0] || null
    } else {
      if (parsed.pathname === '/watch') {
        candidateId = parsed.searchParams.get('v')
      } else if (
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/shorts/') ||
        parsed.pathname.startsWith('/v/')
      ) {
        const segments = parsed.pathname.split('/').filter(Boolean)
        candidateId = segments[1] || null
      } else if (parsed.searchParams.has('v')) {
        candidateId = parsed.searchParams.get('v')
      }
    }

    if (candidateId && YOUTUBE_ID_REGEX.test(candidateId)) {
      return candidateId
    }

    return null
  } catch {
    return null
  }
}

/**
 * Kiểm tra tính hợp lệ của URL YouTube
 * @param {string} url
 * @returns {boolean}
 */
export const isValidYouTubeUrl = (url) => {
  return extractYouTubeVideoId(url) !== null
}

/**
 * Sinh URL nhúng (Embed) YouTube chuẩn và an toàn
 * @param {string} videoId
 * @param {object} [options]
 * @returns {string}
 */
export const getYouTubeEmbedUrl = (videoId, options = {}) => {
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return ''
  }

  const params = new URLSearchParams()
  params.set('autoplay', options.autoplay ? '1' : '0')
  params.set('rel', '0')
  params.set('modestbranding', '1')

  const query = params.toString()
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ''}`
}

/**
 * Lấy URL ảnh thu nhỏ (thumbnail) của video YouTube
 * @param {string} videoId
 * @param {'hqdefault'|'mqdefault'|'sddefault'|'maxresdefault'} [quality='hqdefault']
 * @returns {string}
 */
export const getYouTubeThumbnailUrl = (videoId, quality = 'hqdefault') => {
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return ''
  }
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

