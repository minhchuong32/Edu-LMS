import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("accessToken"));
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("accessToken"));
  const [loading, setLoading] = useState(true);

  // Initialize and check current authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (storedToken) {
        try {
          // Verify with server. If the server lacks this endpoint, fall back to our stored session
          const response = await authService.getMe();
          
          if (response?.success && (response?.data?.user || response?.user)) {
            const userProfile = response.data?.user || response.user;
            setUser(userProfile);
            localStorage.setItem("user", JSON.stringify(userProfile));
            setIsAuthenticated(true);
          } else if (storedUser) {
            // Keep the logged-in user role session details
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // No cached user profile details; reset auth state
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

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { token: accessToken, user: userData } = await authService.login(email, password);

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } finally {
      setLoading(false);
    }
  };

  // First-time account activation handler
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


  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
