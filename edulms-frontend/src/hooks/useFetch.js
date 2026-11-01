
import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook gọi API và quản lý data, loading, error.
 *
 * @param {Function} fetchFunction Hàm async trả về dữ liệu
 * @returns {{ data: any, loading: boolean, error: string|null, refetch: Function }}
 */
export const useFetch = (fetchFunction) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [requestKey, setRequestKey] = useState(0)

  const refetch = useCallback(() => {
    setRequestKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        const result = await fetchFunction()

        if (active) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (active) {
          console.error('useFetch error:', err)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Có lỗi xảy ra khi tải dữ liệu',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      active = false
    }
  }, [fetchFunction, requestKey])

  return {
    data,
    loading,
    error,
    refetch,
  }
}

export default useFetch
