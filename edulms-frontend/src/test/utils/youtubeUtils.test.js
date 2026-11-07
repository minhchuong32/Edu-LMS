import { describe, it, expect } from 'vitest'
import {
  extractYouTubeVideoId,
  isValidYouTubeUrl,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from '@/utils/youtubeUtils'

describe('youtubeUtils Unit Tests', () => {
  const VALID_ID = 'dQw4w9WgXcQ'

  it('1. Trích xuất đúng Video ID từ nhiều định dạng URL YouTube', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${VALID_ID}&t=120s`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://youtu.be/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://youtu.be/${VALID_ID}?t=10`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${VALID_ID}`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(`https://m.youtube.com/watch?v=${VALID_ID}`)).toBe(VALID_ID)
    expect(extractYouTubeVideoId(VALID_ID)).toBe(VALID_ID)
  })

  it('2. Từ chối URL không hợp lệ và chặn XSS / iframe injection', () => {
    expect(extractYouTubeVideoId('')).toBeNull()
    expect(extractYouTubeVideoId(null)).toBeNull()
    expect(extractYouTubeVideoId('https://vimeo.com/12345')).toBeNull()
    expect(extractYouTubeVideoId('https://google.com')).toBeNull()
    expect(extractYouTubeVideoId('<iframe src="test"></iframe>')).toBeNull()
    expect(extractYouTubeVideoId('javascript:alert(1)')).toBeNull()
    expect(extractYouTubeVideoId('invalid string with spaces')).toBeNull()
  })

  it('3. isValidYouTubeUrl kiểm tra chính xác', () => {
    expect(isValidYouTubeUrl(`https://www.youtube.com/watch?v=${VALID_ID}`)).toBe(true)
    expect(isValidYouTubeUrl(`https://youtu.be/${VALID_ID}`)).toBe(true)
    expect(isValidYouTubeUrl('https://otherdomain.com/video')).toBe(false)
  })

  it('4. getYouTubeEmbedUrl sinh URL chuẩn không autoplay', () => {
    const url = getYouTubeEmbedUrl(VALID_ID)
    expect(url).toContain(`https://www.youtube.com/embed/${VALID_ID}`)
    expect(url).toContain('autoplay=0')
    expect(url).toContain('rel=0')
    expect(getYouTubeEmbedUrl('')).toBe('')
  })

  it('5. getYouTubeThumbnailUrl sinh đường dẫn ảnh bìa', () => {
    const thumb = getYouTubeThumbnailUrl(VALID_ID)
    expect(thumb).toBe(`https://img.youtube.com/vi/${VALID_ID}/hqdefault.jpg`)
  })
})

