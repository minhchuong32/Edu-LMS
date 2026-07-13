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
    success: "bg-emerald-50 text-success border-emerald-100",
    warning: "bg-amber-50 text-warning border-amber-100",
    danger: "bg-rose-50 text-danger border-rose-100",
    neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  };

  // Specific role configurations as requested
  const roleStyles = {
    student: "bg-blue-50 text-blue-600 border-blue-100",
    teacher: "bg-purple-50 text-purple-600 border-purple-100",
    admin: "bg-orange-50 text-orange-600 border-orange-100",
    parent: "bg-green-50 text-green-600 border-green-100",
  };

  const selectedStyle = role
    ? roleStyles[role.toLowerCase()] || variants.primary
    : variants[variant];

  return (
    <span className={`${baseStyles} ${selectedStyle} ${className}`} {...props}>
      {/* Optional dot decorator for status badges */}
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
