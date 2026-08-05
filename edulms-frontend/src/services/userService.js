import axiosClient from "../api/axiosClient";

const userService = {
  // Get all users or filter by role, search, classRef
  getUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await axiosClient.get(`/users${query ? `?${query}` : ""}`);
  },

  // Get single user by ID
  getUserById: async (id) => {
    return await axiosClient.get(`/users/${id}`);
  },

  // Create new user (admin, teacher, student, parent)
  createUser: async (userData) => {
    return await axiosClient.post("/users", userData);
  },

  // Update user profile, role, status, codes, or password
  updateUser: async (id, userData) => {
    return await axiosClient.put(`/users/${id}`, userData);
  },

  // Delete user by ID
  deleteUser: async (id) => {
    return await axiosClient.delete(`/users/${id}`);
  },

  // Update student's class
  updateUserClass: async (id, classRef) => {
    return await axiosClient.put(`/users/${id}/class`, { classRef });
  },
};

export default userService;
