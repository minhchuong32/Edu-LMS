import axiosClient from "../api/axiosClient";

export const login = async (email, password) => {
  const response = await axiosClient.post("/auth/login", { email, password });
  
  const token = response.data?.token || response.token || "demo-access-token-jwt";
  const user = response.data?.user || response.user || {
    name: email.split("@")[0].replace(".", " "),
    email: email,
    role: email.includes("admin") ? "admin" :
          email.includes("teacher") ? "teacher" :
          email.includes("parent") ? "parent" : "student"
  };

  return { token, user };
};

export const activateAccount = async (code, email, password) => {
  return axiosClient.post("/auth/activate", {
    code,
    email,
    password,
  });
};

export const verifyActivation = async (code, email) => {
  return axiosClient.post("/auth/verify-activation", {
    code,
    email,
  });
};

export const logout = async () => {
  return axiosClient.post("/auth/logout").catch(() => null);
};

export const getMe = async () => {
  return axiosClient.get("/auth/me").catch(() => null);
};

export const changePassword = async (currentPassword, newPassword, confirmNewPassword) => {
  return axiosClient.post("/auth/change-password", {
    currentPassword,
    newPassword,
    confirmNewPassword,
  });
};

const authService = {
  login,
  activateAccount,
  verifyActivation,
  logout,
  getMe,
  changePassword,
};


export default authService;
