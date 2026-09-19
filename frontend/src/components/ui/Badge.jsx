import React from "react";

export const Badge = ({ children, variant = "primary", className = "", dot = false }) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && <span className="pulse-dot" />}
      {children}
    </span>
  );
};
