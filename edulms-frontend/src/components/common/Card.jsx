import React from "react";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-xl p-5 shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
