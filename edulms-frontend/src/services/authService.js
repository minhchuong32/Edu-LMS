import axiosClient from "../api/axiosClient";

export const login = async (email, password) => {
  const response = await axiosClient.post("/auth/login", { email, password });
  
  const token = response.token || "demo-access-token-jwt";
  const user = response.user || {
    name: email.split("@")[0].replace(".", " "),
    email: email,
    role: email.includes("admin") ? "admin" :
          email.includes("teacher") ? "teacher" :
          email.includes("parent") ? "parent" : "student",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
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

export const logout = async () => {
  return axiosClient.post("/auth/logout").catch(() => null);
};

export const getMe = async () => {
  return axiosClient.get("/auth/me").catch(() => null);
};

const authService = {
  login,
  activateAccount,
  logout,
  getMe
};

export default authService;
