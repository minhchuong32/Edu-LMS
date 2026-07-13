import React from "react";

export default function Input({
  label,
  id,
  type = "text",
  placeholder = "",
  value,
  onChange,
  error = "",
  className = "",
  ...props
}) {
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
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`px-3 py-2 text-sm text-neutral-900 placeholder-neutral-600 bg-white border ${
          error ? "border-danger focus:ring-danger focus:border-danger" : "border-neutral-200 focus:ring-primary focus:border-primary"
        } rounded-lg outline-none focus:ring-1 transition duration-150 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
