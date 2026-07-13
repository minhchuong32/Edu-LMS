import React from "react";

export default function Button({
  children,
  type = "button",
  variant = "primary",
  onClick,
  disabled = false,
  className = "",
  ...props
}) {
  const baseStyles = "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 outline-none flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-sm shadow-primary/10",
    success: "bg-success text-white hover:bg-emerald-600 active:scale-[0.98] shadow-sm shadow-success/10",
    warning: "bg-warning text-white hover:bg-amber-600 active:scale-[0.98] shadow-sm shadow-warning/10",
    danger: "bg-danger text-white hover:bg-rose-600 active:scale-[0.98] shadow-sm shadow-danger/10",
    outline: "border border-neutral-200 text-neutral-600 bg-white hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed active:scale-100" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
