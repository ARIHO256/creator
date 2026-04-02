import React from "react";
import clsx from "clsx";
import Button from "./Button";

/**
 * EmptyState - Standardized empty state component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Optional icon
 * @param {string|React.ReactNode} props.title - Title text
 * @param {string|React.ReactNode} props.description - Description text
 * @param {Object} props.primaryAction - Primary action button {label, onClick, variant}
 * @param {Object} props.secondaryAction - Secondary action button {label, onClick, variant}
 * @param {string} props.className - Additional classes
 */
type EmptyAction = {
  label: React.ReactNode;
  onClick?: () => void;
  variant?: "contained" | "outlined" | "ghost" | "text";
};

type EmptyStateProps = {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: EmptyAction;
  secondaryAction?: EmptyAction;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center",
        "rounded-2xl border border-dashed border-ink-200 bg-ink-50",
        "px-6 py-12 sm:py-16",
        "text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-4xl text-ink-400 sm:text-5xl">
          {icon}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-ink-900 sm:text-xl">
          {typeof title === "string" ? title : title}
        </h3>
      )}
      {description && (
        <p className="mt-2 max-w-md text-sm text-ink-600 sm:text-base">
          {typeof description === "string" ? description : description}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Button
              variant={primaryAction.variant || "contained"}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || "outlined"}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
