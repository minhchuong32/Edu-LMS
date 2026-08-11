import axiosClient from "../api/axiosClient";

const studentService = {
  /**
   * Get parents for a specific student
   * GET /students/:studentId/parents
   */
  getStudentParents: async (studentId) => {
    return await axiosClient.get(`/students/${studentId}/parents`);
  },

  /**
   * Link parent to student
   * POST /students/:studentId/parents
   * @param {String} studentId
   * @param {Object} data { parentId, relationship }
   */
  addParent: async (studentId, data) => {
    return await axiosClient.post(`/students/${studentId}/parents`, data);
  },

  /**
   * Unlink parent from student
   * DELETE /students/:studentId/parents/:parentId
   * @param {String} studentId
   * @param {String} parentId
   */
  removeParent: async (studentId, parentId) => {
    return await axiosClient.delete(`/students/${studentId}/parents/${parentId}`);
  },
};

export default studentService;
