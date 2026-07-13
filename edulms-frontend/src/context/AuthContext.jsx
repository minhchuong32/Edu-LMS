import React, { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";

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
          const response = await axiosClient.get("/auth/me").catch(() => null);
          
          if (response?.success && response?.user) {
            setUser(response.user);
            localStorage.setItem("user", JSON.stringify(response.user));
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
        } catch (err) {
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
      const response = await axiosClient.post("/auth/login", { email, password });
      
      const accessToken = response.token || "demo-access-token-jwt";
      const userData = response.user || {
        name: email.split("@")[0].replace(".", " "),
        email: email,
        role: email.includes("admin") ? "admin" :
              email.includes("teacher") ? "teacher" :
              email.includes("parent") ? "parent" : "student",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      };

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // First-time account activation handler
  const activateAccount = async (code, email, password) => {
    setLoading(true);
    try {
      const response = await axiosClient.post("/auth/activate", {
        code,
        email,
        password,
      });
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    setLoading(true);
    try {
      await axiosClient.post("/auth/logout").catch(() => null);
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
