import axiosClient from "../api/axiosClient";

const studentService = {
  /**
   * Get parents for a specific student
   * GET /students/:studentId/parents
   */
  getStudentParents: async (studentId) => {
    return await axiosClient.get(`/students/${studentId}/parents`);
  },
};

export default studentService;
