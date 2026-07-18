import React, { forwardRef } from "react";

const Input = forwardRef(({
  label,
  id,
  type = "text",
  placeholder = "",
  error = "",
  className = "",
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-neutral-900 font-sans">
          {label}
        </label>
      )}
      <input
        type={type}
        id={id}
        ref={ref}
        placeholder={placeholder}
        className={`px-3.5 py-2 text-sm text-neutral-900 placeholder-neutral-400 bg-white border ${
          error ? "border-danger focus:ring-danger focus:border-danger ring-danger/20" : "border-neutral-200 focus:ring-primary focus:border-primary ring-primary/20"
        } rounded-lg outline-none focus:ring-1 transition duration-150 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs font-medium text-danger flex items-center gap-1 mt-0.5 animate-fadeIn">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;

