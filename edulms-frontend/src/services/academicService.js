import axiosClient from "../api/axiosClient";

const academicService = {
  // --- Grades (Khối) ---
  getGrades: async () => {
    return await axiosClient.get("/academic/grades");
  },
  createGrade: async (gradeData) => {
    return await axiosClient.post("/academic/grades", gradeData);
  },
  updateGrade: async (id, gradeData) => {
    return await axiosClient.put(`/academic/grades/${id}`, gradeData);
  },
  deleteGrade: async (id) => {
    return await axiosClient.delete(`/academic/grades/${id}`);
  },

  // --- Classes (Lớp) ---
  getClasses: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/academic/classes${query ? `?${query}` : ""}`);
  },
  createClass: async (classData) => {
    return await axiosClient.post("/academic/classes", classData);
  },
  updateClass: async (id, classData) => {
    return await axiosClient.put(`/academic/classes/${id}`, classData);
  },
  deleteClass: async (id) => {
    return await axiosClient.delete(`/academic/classes/${id}`);
  },

  // --- Subjects (Môn học) ---
  getSubjects: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/academic/subjects${query ? `?${query}` : ""}`);
  },
  createSubject: async (subjectData) => {
    return await axiosClient.post("/academic/subjects", subjectData);
  },
  updateSubject: async (id, subjectData) => {
    return await axiosClient.put(`/academic/subjects/${id}`, subjectData);
  },
  deleteSubject: async (id) => {
    return await axiosClient.delete(`/academic/subjects/${id}`);
  },

  // --- Teaching Assignments (Phân công giảng dạy) ---
  getTeachingAssignments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/academic/teaching-assignments${query ? `?${query}` : ""}`);
  },
  createTeachingAssignment: async (assignmentData) => {
    return await axiosClient.post("/academic/teaching-assignments", assignmentData);
  },
  updateTeachingAssignment: async (id, assignmentData) => {
    return await axiosClient.put(`/academic/teaching-assignments/${id}`, assignmentData);
  },
  deleteTeachingAssignment: async (id) => {
    return await axiosClient.delete(`/academic/teaching-assignments/${id}`);
  },

  // --- Users / Teachers & Students List ---
  getTeachers: async (search = "") => {
    const query = new URLSearchParams({ role: "teacher" });
    if (search) query.append("search", search);
    return await axiosClient.get(`/users?${query.toString()}`);
  },
  getStudents: async (params = {}) => {
    const query = new URLSearchParams({ role: "student", ...params }).toString();
    return await axiosClient.get(`/users?${query}`);
  },
  updateUserClass: async (studentId, classRef) => {
    return await axiosClient.put(`/users/${studentId}/class`, { classRef });
  },

  // --- Class Transfer & History ---
  transferStudentClass: async (transferData) => {
    return await axiosClient.post("/academic/classes/transfer", transferData);
  },
  batchTransferClass: async (batchData) => {
    return await axiosClient.post("/academic/classes/batch-transfer", batchData);
  },
  getTransferHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/academic/classes/transfer-history${query ? `?${query}` : ""}`);
  }
};

export default academicService;
