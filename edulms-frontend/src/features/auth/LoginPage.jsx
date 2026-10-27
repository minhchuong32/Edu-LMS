import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "./../../context/useAuth";
import {
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isNotActivated, setIsNotActivated] = useState(false);
  const [successNotice] = useState(
    () => location.state?.successNotice || ""
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: location.state?.activatedEmail || "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setApiError("");
    setIsNotActivated(false);

    try {
      const res = await login({
        email: data.email.trim(),
        password: data.password,
      });

      const user = res.data?.user || res.user;
      const role = user?.role || "student";

      // Chuyển hướng về trang trước đó nếu người dùng bị PrivateRoute chuyển đến login
      const from = location.state?.from;
      const fromPath = typeof from === "string" ? from : from?.pathname;
      if (fromPath && fromPath !== "/login" && fromPath !== "/unauthorized") {
        navigate(fromPath, { replace: true });
        return;
      }

      switch (role) {
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "teacher":
          navigate("/teacher/dashboard");
          break;
        case "student":
          navigate("/student/dashboard");
          break;
        case "parent":
          navigate("/parent/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      const message =
        err.message ||
        (typeof err === "string"
          ? err
          : "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.");

      if (
        message.toLowerCase().includes("chưa được kích hoạt") ||
        err.status === 403 ||
        err.statusCode === 403
      ) {
        setIsNotActivated(true);
      }

      setApiError(message);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-slate-900">
          Đăng nhập hệ thống
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Nhập email và mật khẩu được cấp hoặc đã kích hoạt
        </p>
      </div>

      {successNotice && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {apiError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex flex-col gap-1.5 animate-fadeIn">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{apiError}</span>
          </div>
          {isNotActivated && (
            <div className="mt-1 pt-1.5 border-t border-red-200">
              <Link
                to="/activate"
                className="font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bấm vào đây để kích hoạt tài khoản ngay</span>
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="example@edulms.edu.vn"
              disabled={isSubmitting}
              {...register("email", {
                required: "Vui lòng nhập địa chỉ email.",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Địa chỉ email không đúng định dạng.",
                },
              })}
              className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                errors.email
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-600"
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  "Vui lòng liên hệ Quản trị viên nhà trường để được hỗ trợ cấp lại mật khẩu!"
                );
              }}
              className="text-[11px] font-medium text-blue-600 hover:underline"
            >
              Quên mật khẩu?
            </a>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={isSubmitting}
              {...register("password", {
                required: "Vui lòng nhập mật khẩu.",
              })}
              className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                errors.password
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-200 focus:border-blue-600"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2 cursor-pointer"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
        Được nhà trường cấp tài khoản mới?{" "}
        <Link
          to="/activate"
          className="font-semibold text-blue-600 hover:underline"
        >
          Kích hoạt tài khoản ngay
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
