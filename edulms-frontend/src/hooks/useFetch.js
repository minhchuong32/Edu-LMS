import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook xử lý gọi API async kèm quản lý trạng thái loading, error và refetch
 * @param {Function} fetchFunction Hàm async trả về dữ liệu API
 * @param {Array} dependencies Mảng dependencies trigger fetch lại
 * @returns {object} { data, loading, error, refetch }
 */
export const useFetch = (fetchFunction, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const executeFetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFunction()
      setData(result)
    } catch (err) {
      console.error('useFetch error:', err)
      setError(err?.response?.data?.message || err.message || 'Có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    executeFetch()
  }, [executeFetch])

  return { data, loading, error, refetch: executeFetch }
}

export default useFetch
