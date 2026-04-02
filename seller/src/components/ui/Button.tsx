import React from "react";
import clsx from "clsx";

/**
 * Button - Standardized button component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.variant - Button variant (contained|outlined|ghost|text)
 * @param {string} props.size - Button size (sm|md|lg)
 * @param {React.ReactNode} props.leadingIcon - Icon before text
 * @param {React.ReactNode} props.trailingIcon - Icon after text
 * @param {string} props.className - Additional classes
 * @param {boolean} props.fullWidth - Full width button
 * @param {boolean} props.destructive - Destructive/error variant
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
  variant?: "contained" | "outlined" | "ghost" | "text";
  size?: "sm" | "md" | "lg";
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  destructive?: boolean;
};

export default function Button({
  children,
  variant = "contained",
  size = "md",
  leadingIcon,
  trailingIcon,
  className,
  fullWidth = false,
  destructive = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={props.type || "button"}
      className={clsx(
        // Base styles
        "inline-flex items-center justify-center gap-2",
        "font-semibold",
        "rounded-lg", // 16px border radius
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Size
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        // Variants
        variant === "contained" && [
          destructive
            ? "bg-error-500 text-white hover:bg-error-600 focus:ring-error-500"
            : "bg-secondary-500 text-white hover:bg-secondary-600 focus:ring-secondary-500 shadow-sm hover:shadow-md",
        ],
        variant === "outlined" && [
          destructive
            ? "border-2 border-error-500 text-error-600 hover:bg-error-50 focus:ring-error-500"
            : "border-2 border-secondary-500 text-secondary-600 hover:bg-secondary-50 focus:ring-secondary-500",
        ],
        variant === "ghost" && [
          destructive
            ? "text-error-600 hover:bg-error-50 focus:ring-error-500"
            : "text-secondary-600 hover:bg-secondary-50 focus:ring-secondary-500",
        ],
        variant === "text" && [
          destructive
            ? "text-error-600 hover:bg-error-50 focus:ring-error-500"
            : "text-ink-700 hover:bg-ink-100 focus:ring-ink-500",
        ],
        // Full width
        fullWidth && "w-full",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {leadingIcon && <span className="flex-shrink-0">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
    </button>
  );
}
