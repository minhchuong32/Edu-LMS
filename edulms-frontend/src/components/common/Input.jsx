import React, { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

const Input = forwardRef(({
  label,
  id,
  type = "text",
  placeholder = "",
  error = "",
  className = "",
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === "password";
  const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-neutral-900 font-sans">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <input
          type={inputType}
          id={id}
          ref={ref}
          placeholder={placeholder}
          className={`w-full px-3.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 bg-white border ${
            error ? "border-danger focus:ring-danger focus:border-danger ring-danger/20" : "border-neutral-200 focus:ring-primary focus:border-primary ring-primary/20"
          } rounded-lg outline-none focus:ring-1 transition duration-150 ${isPasswordType ? "pr-10" : ""} ${className}`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none transition-colors p-0.5"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <span className="text-xs font-medium text-danger flex items-center gap-1.5 mt-0.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;


