import React from "react";

export const Button = ({ children, onClick, variant = "primary", className = "", disabled, type = "button" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${className}`}
    >
      {children}
    </button>
  );
};
