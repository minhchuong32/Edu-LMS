import React, { useState } from "react";
import authService from "../../../services/authService";
import { useAuth } from "../../../context/AuthContext";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import { Lock, Key, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SecuritySettings() {
  const { logout } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!formData.currentPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (!formData.newPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (formData.newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải chứa ít nhất 6 ký tự.");
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      setErrorMessage("Xác nhận mật khẩu mới không trùng khớp.");
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      setErrorMessage("Mật khẩu mới không được trùng với mật khẩu hiện tại.");
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmNewPassword
      );
      setSuccessMessage(
        "Đổi mật khẩu thành công! Tất cả các phiên đăng nhập cũ đã được hủy (Revoke Refresh Token). Đang đăng xuất và chuyển hướng đến trang đăng nhập..."
      );
      setTimeout(async () => {
        await logout();
        window.location.href = "/login";
      }, 1800);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <span className="bg-primary/10 text-primary font-bold text-xs px-2.5 py-0.5 rounded-full">
            Security Settings
          </span>
        </div>
        <h1 className="text-2xl font-bold font-outfit text-neutral-900">
          Cấu hình Bảo mật & Đổi mật khẩu
        </h1>
        <p className="text-xs text-neutral-500">
          Cập nhật mật khẩu tài khoản của bạn. Sau khi đổi mật khẩu thành công, tất cả các phiên làm việc (Refresh Token) cũ sẽ bị hủy để bảo mật tài khoản tuyệt đối.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Đổi mật khẩu tài khoản</h2>
            <p className="text-xs text-neutral-500">
              Nhập mật khẩu hiện tại và mật khẩu mới để thiết lập lại quyền truy cập.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            label="Current password"
            id="current-password"
            type="password"
            placeholder="••••••••"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
          />

          <Input
            label="New password"
            id="new-password"
            type="password"
            placeholder="••••••••"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
          />

          <Input
            label="Confirm new password"
            id="confirm-new-password"
            type="password"
            placeholder="••••••••"
            value={formData.confirmNewPassword}
            onChange={(e) => setFormData({ ...formData, confirmNewPassword: e.target.value })}
            required
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="py-2.5 px-6 text-xs font-bold rounded-xl shadow-md shadow-primary/20 flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Change Password
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
