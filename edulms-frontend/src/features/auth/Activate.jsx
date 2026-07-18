import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function Activate() {
  const { verifyActivation, activateAccount } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [verifiedName, setVerifiedName] = useState("");
  const [codeVal, setCodeVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  
  const [apiError, setApiError] = useState("");
  const [apiSuccess, setApiSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for Step 1: Verify Code & Email
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm({
    defaultValues: {
      code: "",
      email: "",
    },
    mode: "onTouched",
  });

  // Form for Step 2: Choose Password
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    watch: watchStep2,
    formState: { errors: errorsStep2 },
  } = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const passwordVal = watchStep2("password");

  // Step 1 Submit Handler
  const onStep1Submit = async (data) => {
    setApiError("");
    setApiSuccess("");
    setIsSubmitting(true);
    try {
      const response = await verifyActivation(data.code, data.email);
      setVerifiedName(response?.data?.name || "Thành viên");
      setCodeVal(data.code);
      setEmailVal(data.email);
      setStep(2);
    } catch (err) {
      setApiError(err?.message || "Xác thực thất bại. Vui lòng kiểm tra lại Mã số và Email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Submit Handler
  const onStep2Submit = async (data) => {
    setApiError("");
    setApiSuccess("");
    setIsSubmitting(true);
    try {
      await activateAccount(codeVal, emailVal, data.password);
      setApiSuccess("Kích hoạt tài khoản thành công! Đang chuyển hướng về trang đăng nhập...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      setApiError(err?.message || "Đặt mật khẩu thất bại. Vui lòng thử lại.");
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

        {/* Brand Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-indigo-600 text-white font-extrabold font-outfit rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg shadow-primary/25 transform hover:scale-105 transition-transform duration-300">
            E
          </div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight font-sans">
            Kích hoạt tài khoản
          </h2>
          <p className="text-xs text-neutral-500 max-w-[280px] mx-auto leading-relaxed font-medium">
            Kích hoạt tài khoản lần đầu để bắt đầu tham gia lớp học trực tuyến.
          </p>
        </div>

        {/* Custom Progress Stepper */}
        <div className="relative z-10 flex items-center justify-between px-6 py-2 bg-neutral-50/70 border border-neutral-200/40 rounded-xl">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 1 
                ? "bg-primary text-white ring-4 ring-primary/10" 
                : "bg-success text-white"
            }`}>
              {step === 1 ? "1" : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-xs font-bold transition-colors ${step === 1 ? "text-primary" : "text-neutral-500"}`}>
              Xác thực
            </span>
          </div>

          <div className="flex-1 h-0.5 mx-3 bg-neutral-200 relative overflow-hidden">
            <div className={`absolute left-0 top-0 h-full bg-primary transition-all duration-500 ${
              step === 2 ? "w-full" : "w-0"
            }`} />
          </div>

          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 2 
                ? "bg-primary text-white ring-4 ring-primary/10" 
                : "bg-neutral-200 text-neutral-500"
            }`}>
              2
            </div>
            <span className={`text-xs font-bold transition-colors ${step === 2 ? "text-primary" : "text-neutral-400"}`}>
              Đặt mật khẩu
            </span>
          </div>
        </div>

        {/* Global/API feedback messages */}
        {apiError && (
          <div className="p-3.5 bg-rose-50 border border-danger/20 text-danger text-xs font-semibold rounded-xl flex items-start gap-2.5 animate-fadeIn relative z-10">
            <svg className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-danger" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{apiError}</span>
          </div>
        )}

        {apiSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-success/20 text-success text-xs font-semibold rounded-xl flex items-start gap-2.5 animate-fadeIn relative z-10">
            <svg className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{apiSuccess}</span>
          </div>
        )}

        {/* Form representation */}
        <div className="relative z-10">
          {step === 1 ? (
            <form onSubmit={handleSubmitStep1(onStep1Submit)} className="space-y-4" noValidate>
              <Input
                label="Mã học sinh / giáo viên (Mã định danh)"
                id="code-input"
                placeholder="VD: HS-1001 hoặc GV-2002"
                error={errorsStep1.code?.message}
                {...registerStep1("code", {
                  required: "Vui lòng nhập mã định danh.",
                  pattern: {
                    value: /^[A-Za-z0-9-]+$/,
                    message: "Mã định danh chỉ gồm chữ cái, số và dấu gạch ngang.",
                  },
                })}
              />

              <Input
                label="Email đăng ký của trường"
                id="email-input"
                type="email"
                placeholder="VD: nam.student@edulms.edu"
                error={errorsStep1.email?.message}
                {...registerStep1("email", {
                  required: "Vui lòng nhập email đăng ký.",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Địa chỉ email không đúng định dạng.",
                  },
                })}
              />

              <Button type="submit" variant="primary" className="w-full font-bold py-2.5 mt-2 rounded-xl text-sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang xác thực thông tin...
                  </>
                ) : (
                  "Xác thực"
                )}
              </Button>

              <div className="text-center pt-2">
                <span
                  onClick={() => navigate("/login")}
                  className="text-xs font-bold text-neutral-500 hover:text-primary transition-colors cursor-pointer"
                >
                  Quay lại trang đăng nhập
                </span>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitStep2(onStep2Submit)} className="space-y-4 animate-slideLeft" noValidate>
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed font-medium">
                Chào mừng <strong className="text-primary font-bold">{verifiedName}</strong>! Thông tin của bạn đã được xác nhận. Vui lòng thiết lập mật khẩu mới dưới đây.
              </div>

              <Input
                label="Mật khẩu mới"
                id="password-input"
                type="password"
                placeholder="Tối thiểu 6 ký tự..."
                error={errorsStep2.password?.message}
                {...registerStep2("password", {
                  required: "Vui lòng nhập mật khẩu mới.",
                  minLength: {
                    value: 6,
                    message: "Mật khẩu phải chứa ít nhất 6 ký tự.",
                  },
                })}
              />

              <Input
                label="Xác nhận mật khẩu mới"
                id="confirm-password-input"
                type="password"
                placeholder="Nhập lại mật khẩu mới..."
                error={errorsStep2.confirmPassword?.message}
                {...registerStep2("confirmPassword", {
                  required: "Vui lòng xác nhận mật khẩu.",
                  validate: (value) => 
                    value === passwordVal || "Mật khẩu xác nhận không khớp.",
                })}
              />

              <div className="flex gap-2.5 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-1/3 font-bold py-2.5 rounded-xl text-sm" 
                  disabled={isSubmitting}
                  onClick={() => {
                    setStep(1);
                    setApiError("");
                  }}
                >
                  Quay lại
                </Button>
                <Button type="submit" variant="success" className="w-2/3 font-bold py-2.5 rounded-xl text-sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Đang kích hoạt...
                    </>
                  ) : (
                    "Kích hoạt tài khoản"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}

