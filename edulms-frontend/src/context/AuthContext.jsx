import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

//  Làm việc ở tầng Giao diện React (UI & State) 
//  (quản lý ai đang đăng nhập, hiển thị tên/avatar
//   , ẩn/hẹn menu theo quyền Admin/Giáo viên/Học sinh, điều hướng trang).

// khởi tạo Context để quản lý trạng thái xác thực
const AuthContext = createContext(null);

// AuthProvider component
export function AuthProvider({ children }) {
  // Lưu thông tin user (sử dụng function vì nó chỉ chạy khi component khởi tạo lần đầu)
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  // Lưu token
  const [token, setToken] = useState(() => localStorage.getItem("accessToken"));
  // Kiểm tra trạng thái xác thực (!! -> ép về boolean)
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("accessToken"));
  // Kiểm tra trạng thái tải
  const [loading, setLoading] = useState(true);

  // Khởi tạo và kiểm tra trạng thái xác thực chạy lại khi token thay đổi
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken) {
        try {
          // Kiểm tra token với server. Nếu server không có endpoint này, quay lại phiên đã lưu
          const response = await authService.getMe();
          // Kiểm tra response từ server
          if (response?.success && (response?.data?.user || response?.user)) {
            // Nếu có response từ server, cập nhật user và token
            const userProfile = response.data?.user || response.user;
            setUser(userProfile);
            localStorage.setItem("user", JSON.stringify(userProfile));
            setIsAuthenticated(true);
          } else if (storedUser) {
            // Giữ lại thông tin phiên đăng nhập của người dùng
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Không có thông tin hồ sơ người dùng; đặt lại trạng thái xác thực
            localStorage.removeItem("accessToken");
            localStorage.removeItem("user");
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  // Xử lý đăng nhập
  const login = async (email, password) => {
    setLoading(true);
    try {
      // destructuring để lấy token và user từ response của server
      const { token: accessToken, user: userData } = await authService.login(email, password);

      // Lưu token và user vào localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      // Cập nhật token và user
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  // Xử lý kích hoạt tài khoản lần đầu
  const activateAccount = async (code, email, password) => {
    setLoading(true);
    try {
      return await authService.activateAccount(code, email, password);
    } finally {
      setLoading(false);
    }
  };

  // Verify account activation info (Step 1)
  const verifyActivation = async (code, email) => {
    setLoading(true);
    try {
      return await authService.verifyActivation(code, email);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    activateAccount,
    verifyActivation,
  };

  // Sử dụng Context.Provider để bọc toàn bộ ứng dụng và truyền value xuống các component con
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
