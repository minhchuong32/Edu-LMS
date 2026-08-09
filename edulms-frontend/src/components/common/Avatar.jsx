import React, { useState } from "react";

export default function Avatar({
  src,
  name = "User",
  email = "",
  size = "md",
  className = "",
  onClick,
  ...props
}) {
  const [imageError, setImageError] = useState(false);

  // Compute uppercase initial character from name or email
  const getInitial = () => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(" ");
      return parts[parts.length - 1].charAt(0).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
    xl: "w-16 h-16 text-xl",
    "2xl": "w-20 h-20 text-2xl",
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  const showImage = src && !imageError;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${
        onClick ? "cursor-pointer hover:opacity-90 transition" : ""
      } ${className}`}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className={`${currentSizeClass} rounded-full object-cover border border-neutral-200 shadow-sm`}
        />
      ) : (
        <div
          className={`${currentSizeClass} rounded-full bg-primary text-white font-bold font-outfit flex items-center justify-center shadow-sm border border-primary/20 ring-2 ring-primary-light/50`}
        >
          {getInitial()}
        </div>
      )}
    </div>
  );
}
