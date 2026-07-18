import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
    mode: "onTouched",
  });

  // Auto redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role.toLowerCase();
      if (role === "admin") navigate("/admin");
      else if (role === "teacher") navigate("/teacher");
      else if (role === "parent") navigate("/parent");
      else navigate("/student");
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    setApiError("");
    setIsSubmitting(true);
    try {
      const userData = await login(data.email, data.password);
      // Success redirection based on logged in role
      const role = userData.role.toLowerCase();
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "teacher") {
        navigate("/teacher");
      } else if (role === "parent") {
        navigate("/parent");
      } else {
        navigate("/student");
      }
    } catch (err) {
      setApiError(err?.message || "Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center font-sans p-4 sm:p-6">
      <Card className="max-w-md w-full p-6 sm:p-8 shadow-xl border border-neutral-200/50 bg-white/95 backdrop-blur-md space-y-6 rounded-2xl relative overflow-hidden">
        {/* Decorative backdrop gradients */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>

        {/* Back button */}
        <div className="flex justify-start relative z-10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-primary transition-all duration-200 font-semibold group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại trang chủ
          </button>
        </div>

        {/* Brand identity */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-indigo-600 text-white font-extrabold font-outfit rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-primary/25 transform hover:scale-105 transition-transform duration-300">
            E
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-neutral-900 tracking-tight font-sans">
              Đăng nhập EduLMS
            </h2>
            <p className="text-xs text-neutral-500 max-w-[280px] mx-auto leading-relaxed font-medium">
              Sử dụng tài khoản được cung cấp bởi quản trị viên nhà trường của bạn.
            </p>
          </div>
        </div>

        {apiError && (
          <div className="p-3.5 bg-rose-50 border border-danger/20 text-danger text-xs font-semibold rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <svg className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-danger" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 relative z-10" noValidate>
          <Input
            label="Địa chỉ Email"
            id="email-input"
            type="email"
            placeholder="VD: admin@edulms.edu"
            error={errors.email?.message}
            {...register("email", {
              required: "Vui lòng nhập địa chỉ email.",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Địa chỉ email không đúng định dạng.",
              },
            })}
          />

          <Input
            label="Mật khẩu"
            id="password-input"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password", {
              required: "Vui lòng nhập mật khẩu.",
              minLength: {
                value: 6,
                message: "Mật khẩu phải chứa ít nhất 6 ký tự.",
              },
            })}
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-600 select-none group">
              <input
                type="checkbox"
                className="rounded border-neutral-300 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer transition-colors duration-150"
                {...register("rememberMe")}
              />
              Ghi nhớ đăng nhập
            </label>
            <span
              onClick={() => navigate("/activate")}
              className="font-bold text-primary hover:text-primary-hover hover:underline cursor-pointer transition-colors duration-150"
            >
              Kích hoạt tài khoản
            </span>
          </div>

          <Button type="submit" variant="primary" className="w-full font-bold py-2.5 mt-2 rounded-xl text-sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Đang đăng nhập...
              </>
            ) : (
              "Đăng nhập"
            )}
          </Button>
        </form>

        {/* Info Box */}
        <div className="p-4 bg-neutral-50/80 border border-neutral-200/50 rounded-2xl space-y-2 relative z-10">
          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tài khoản chạy thử (Dev Preview):</p>
          <div className="text-[11px] text-neutral-600 font-medium space-y-1.5 leading-normal">
            <p>🔑 <span className="font-semibold text-neutral-900">admin@edulms.edu</span> (Quản trị viên)</p>
            <p>🔑 <span className="font-semibold text-neutral-900">teacher@edulms.edu</span> (Giáo viên)</p>
            <p>🔑 <span className="font-semibold text-neutral-900">student@edulms.edu</span> (Học sinh)</p>
            <p>🔑 <span className="font-semibold text-neutral-900">parent@edulms.edu</span> (Phụ huynh)</p>
            <p className="text-neutral-400 text-[10px] italic pt-1 border-t border-neutral-200/40">Nhập bất kỳ mật khẩu nào dài từ 6 ký tự để đăng nhập.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

