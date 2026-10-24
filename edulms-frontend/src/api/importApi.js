import axiosClient from './axiosClient'

export const importApi = {
  /**
   * Import danh sách từ file Excel
   * @param {'student' | 'teacher'} role
   * @param {File} file File Excel
   */
  importUsers: (role, file) => {
    const formData = new FormData()
    formData.append('file', file)

    return axiosClient.post(`/v1/admin/import/${role}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s cho file lớn
    })
  },
}

export default importApi
