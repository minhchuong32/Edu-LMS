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
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  },
}
