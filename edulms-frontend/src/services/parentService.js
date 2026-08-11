import axiosClient from "../api/axiosClient";

const parentService = {
  /**
   * Get children of current authenticated parent
   * GET /parents/me/children
   */
  getMyChildren: async () => {
    return await axiosClient.get("/parents/me/children");
  },
};

export default parentService;
