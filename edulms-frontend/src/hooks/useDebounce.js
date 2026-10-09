import { useState, useEffect } from 'react'

/**
 * Custom hook hoãn cập nhật giá trị (Debounce) tối ưu cho Ô tìm kiếm
 * @param {any} value Giá trị thay đổi liên tục
 * @param {number} delay Thời gian hoãn (ms)
 * @returns {any}
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
