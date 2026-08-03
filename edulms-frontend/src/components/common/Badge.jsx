import React from "react";

export default function Badge({
  children,
  role,
  variant = "primary",
  className = "",
  ...props
}) {
  const baseStyles = "px-2.5 py-1 text-xs font-semibold rounded-lg border inline-flex items-center gap-1.5 w-fit";

  const variants = {
    primary: "bg-primary-light text-primary border-indigo-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-danger border-rose-200",
    neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  };

  // Specific role configurations matching Design System specifications:
  // Student = xanh dương nhạt, Teacher = tím nhạt, Admin = cam nhạt, Parent = xanh lá nhạt.
  const roleStyles = {
    student: "bg-blue-50 text-blue-700 border-blue-200",
    teacher: "bg-purple-50 text-purple-700 border-purple-200",
    admin: "bg-amber-50 text-amber-700 border-amber-200",
    parent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  const selectedStyle = role
    ? roleStyles[role.toLowerCase()] || variants.primary
    : variants[variant];

  return (
    <span className={`${baseStyles} ${selectedStyle} ${className}`} {...props}>
      {!role && (
        <span className={`w-1.5 h-1.5 rounded-full ${
          variant === "success" ? "bg-success" :
          variant === "warning" ? "bg-warning" :
          variant === "danger" ? "bg-danger" :
          variant === "neutral" ? "bg-neutral-600" :
          "bg-primary"
        }`}></span>
      )}
      {children}
    </span>
  );
}
