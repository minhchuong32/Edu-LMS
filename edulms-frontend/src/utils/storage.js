/**
 * Xóa toàn bộ dữ liệu lưu trữ phía trình duyệt (localStorage, sessionStorage, cookies, caches)
 * Dùng khi người dùng đăng xuất hoặc phiên đăng nhập hết hạn/không hợp lệ.
 */
export const clearAllAuthStorage = () => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.clear()
  } catch (error) {
    console.error('Error clearing localStorage:', error)
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear()
    }
  } catch (error) {
    console.error('Error clearing sessionStorage:', error)
  }

  try {
    if (typeof document !== 'undefined' && document.cookie) {
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=')
        const name = (eqPos > -1 ? cookie.slice(0, eqPos) : cookie).trim()
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      }
    }
  } catch (error) {
    console.error('Error clearing cookies:', error)
  }

  try {
    if (typeof window !== 'undefined' && 'caches' in window && window.caches?.keys) {
      window.caches.keys().then((names) => {
        for (const name of names) {
          window.caches.delete(name)
        }
      }).catch(() => {})
    }
  } catch {
    // Ignore cache storage errors
  }
}

/**
 * Helper tương tác an toàn với LocalStorage / SessionStorage
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error)
      return defaultValue
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting key "${key}" to localStorage:`, error)
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing key "${key}" from localStorage:`, error)
    }
  },
  clear: () => {
    clearAllAuthStorage()
  },
}
