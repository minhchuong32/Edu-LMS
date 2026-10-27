import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  ShieldCheck,
  Mail,
  Lock,
  UserCheck,
  IdCard,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  GraduationCap,
} from 'lucide-react'
import authApi from '@/api/authApi'

export const ActivatePage = () => {
  const [step, setStep] = useState(1) // 1: Xác thực tài khoản, 2: Đặt mật khẩu mới
  const [verifiedUser, setVerifiedUser] = useState(null)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const navigate = useNavigate()

  // React Hook Form cho Bước 1: Xác thực mã định danh và email
  const step1Form = useForm({
    defaultValues: {
      userCode: '',
      email: '',
    },
    mode: 'onTouched',
  })

  // React Hook Form cho Bước 2: Thiết lập mật khẩu mới
  const step2Form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  })

  // Xử lý Bước 1: Xác thực thông tin với Backend
  const onStep1Submit = async (data) => {
    setApiError('')

    try {
      const res = await authApi.verifyActivation({
        userCode: data.userCode.trim(),
        email: data.email.trim(),
      })

      const userInfo = res.data || res
      setVerifiedUser({
        ...userInfo,
        userCode: data.userCode.trim(),
        email: data.email.trim(),
      })

      // Chuyển sang bước 2
      setStep(2)
    } catch (err) {
      const errorMsg =
        err.message ||
        (typeof err === 'string'
          ? err
          : 'Thông tin xác thực không chính xác hoặc tài khoản đã được kích hoạt.')
      setApiError(errorMsg)
    }
  }

  // Xử lý Bước 2: Đặt mật khẩu mới và hoàn tất kích hoạt
  const onStep2Submit = async (data) => {
    if (!verifiedUser) {
      setStep(1)
      return
    }

    setApiError('')
    setSuccessMessage('')

    try {
      const res = await authApi.activate({
        userCode: verifiedUser.userCode,
        email: verifiedUser.email,
        password: data.password,
      })

      const message =
        res.message ||
        'Kích hoạt tài khoản thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
      setSuccessMessage(message)

      // Chuyển hướng tới trang đăng nhập sau 2.5 giây
      setTimeout(() => {
        navigate('/login', {
          state: {
            activatedEmail: verifiedUser.email,
            successNotice: 'Kích hoạt tài khoản thành công! Vui lòng đăng nhập.',
          },
        })
      }, 2500)
    } catch (err) {
      const errorMsg =
        err.message ||
        (typeof err === 'string'
          ? err
          : 'Kích hoạt tài khoản không thành công. Vui lòng thử lại.')
      setApiError(errorMsg)
    }
  }

  return (
    <div>
      {/* Tiêu đề & Icon */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl mb-2.5 shadow-inner">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Kích hoạt tài khoản EduLMS
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Dành cho học sinh và giáo viên được nhà trường cấp tài khoản.
        </p>
      </div>

      {/* Quy trình 2 bước (Stepper Indicator) */}
      <div className="mb-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full z-0" />
          <div
            className={`absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0 ${
              step === 2 || successMessage ? 'w-full' : 'w-1/2'
            }`}
          />

          {/* Nút Bước 1 */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step > 1 || successMessage
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white ring-4 ring-blue-100'
              }`}
            >
              {step > 1 || successMessage ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                '1'
              )}
            </div>
            <span
              className={`text-[11px] font-semibold mt-1 ${
                step >= 1 ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              Xác thực thông tin
            </span>
          </div>

          {/* Nút Bước 2 */}
          <div className="relative z-10 flex flex-col items-center bg-white px-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                successMessage
                  ? 'bg-emerald-600 text-white'
                  : step === 2
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {successMessage ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <span
              className={`text-[11px] font-semibold mt-1 ${
                step === 2 || successMessage
                  ? 'text-blue-600'
                  : 'text-slate-400'
              }`}
            >
              Thiết lập mật khẩu
            </span>
          </div>
        </div>
      </div>

      {/* Thông báo lỗi từ API */}
      {apiError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{apiError}</div>
        </div>
      )}

      {/* Thông báo thành công */}
      {successMessage && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-emerald-900">
              {successMessage}
            </h4>
            <p className="text-emerald-700 mt-1">
              Hệ thống đang tự động điều hướng sang trang đăng nhập trong giây
              lát...
            </p>
            <div className="mt-3">
              <Link
                to="/login"
                state={{
                  activatedEmail: verifiedUser?.email,
                  successNotice: 'Kích hoạt thành công! Vui lòng đăng nhập.',
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-sm transition-all"
              >
                <span>Đến trang Đăng nhập</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* BƯỚC 1: Nhập Mã học sinh/Giáo viên + Email */}
      {step === 1 && !successMessage && (
        <form
          onSubmit={step1Form.handleSubmit(onStep1Submit)}
          className="space-y-4"
          noValidate
        >
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-700">
            <strong>Bước 1/2:</strong> Vui lòng nhập đúng Mã định danh và Email
            được nhà trường cung cấp để hệ thống xác nhận thông tin.
          </div>

          {/* Mã định danh */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mã định danh (Mã Học sinh / Giáo viên)
            </label>
            <div className="relative">
              <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ví dụ: HS2026 hoặc GV001"
                disabled={step1Form.formState.isSubmitting}
                {...step1Form.register('userCode', {
                  required:
                    'Vui lòng nhập mã định danh (Học sinh hoặc Giáo viên).',
                })}
                className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                  step1Form.formState.errors.userCode
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
            </div>
            {step1Form.formState.errors.userCode && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">
                {step1Form.formState.errors.userCode.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ Email đã được Admin đăng ký
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="example@edulms.edu.vn"
                disabled={step1Form.formState.isSubmitting}
                {...step1Form.register('email', {
                  required: 'Vui lòng nhập địa chỉ email đã đăng ký.',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Địa chỉ email không đúng định dạng.',
                  },
                })}
                className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                  step1Form.formState.errors.email
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
            </div>
            {step1Form.formState.errors.email && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">
                {step1Form.formState.errors.email.message}
              </p>
            )}
          </div>

          {/* Nút xác thực bước 1 */}
          <button
            type="submit"
            disabled={step1Form.formState.isSubmitting}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2 cursor-pointer"
          >
            {step1Form.formState.isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Tiếp tục (Kiểm tra thông tin)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* BƯỚC 2: Nhập mật khẩu mới và xác nhận mật khẩu */}
      {step === 2 && !successMessage && (
        <form
          onSubmit={step2Form.handleSubmit(onStep2Submit)}
          className="space-y-4"
          noValidate
        >
          {/* Card hiển thị tài khoản đã xác thực */}
          {verifiedUser && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  {verifiedUser.role === 'teacher' ? (
                    <GraduationCap className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">
                    {verifiedUser.fullName}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mã:{' '}
                    <span className="font-semibold text-slate-700">
                      {verifiedUser.userCode}
                    </span>{' '}
                    • {verifiedUser.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setApiError('')
                }}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                Đổi lại
              </button>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800">
            <strong>Bước 2/2:</strong> Thiết lập mật khẩu bảo mật mới cho tài
            khoản của bạn (tối thiểu 6 ký tự).
          </div>

          {/* Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                disabled={step2Form.formState.isSubmitting}
                {...step2Form.register('password', {
                  required: 'Vui lòng nhập mật khẩu mới.',
                  minLength: {
                    value: 6,
                    message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.',
                  },
                })}
                className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                  step2Form.formState.errors.password
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600'
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
            {step2Form.formState.errors.password && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">
                {step2Form.formState.errors.password.message}
              </p>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Xác nhận lại mật khẩu
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu vừa đặt"
                disabled={step2Form.formState.isSubmitting}
                {...step2Form.register('confirmPassword', {
                  required: 'Vui lòng xác nhận lại mật khẩu mới.',
                  validate: (val) => {
                    const passwordVal = step2Form.getValues('password')
                    return (
                      val === passwordVal ||
                      'Mật khẩu xác nhận không trùng khớp.'
                    )
                  },
                })}
                className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm transition-all focus:outline-none focus:bg-white ${
                  step2Form.formState.errors.confirmPassword
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-slate-200 focus:border-blue-600'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {step2Form.formState.errors.confirmPassword && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">
                {step2Form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Nút hành động Bước 2 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setApiError('')
              }}
              disabled={step2Form.formState.isSubmitting}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <button
              type="submit"
              disabled={step2Form.formState.isSubmitting}
              className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {step2Form.formState.isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Hoàn tất kích hoạt</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer link */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
        Đã kích hoạt tài khoản trước đó?{' '}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Đăng nhập ngay
        </Link>
      </div>
    </div>
  )
}

export default ActivatePage
