import React from "react";
import clsx from "clsx";

/**
 * Card - Standardized card component with consistent styling
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional classes
 * @param {boolean} props.hover - Enable hover effect
 * @param {boolean} props.clickable - Make card appear clickable
 * @param {string} props.variant - Card variant (default|gradient|elevated)
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  clickable?: boolean;
  variant?: "default" | "gradient" | "elevated";
};

export default function Card({ 
  children, 
  className,
  hover = false,
  clickable = false,
  variant = "default",
  ...props 
}: CardProps) {
  return (
    <div
      className={clsx(
        // Base styles
        "rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100",
        // Padding
        "p-4 sm:p-5 lg:p-6",
        // Shadow
        variant === "elevated" ? "shadow-lg" : "shadow-card",
        // Hover effect
        (hover || clickable) && "transition-all duration-200",
        hover && "hover:shadow-card-hover hover:-translate-y-0.5",
        clickable && "cursor-pointer hover:shadow-card-hover",
        // Gradient variant
        variant === "gradient" && "bg-gradient-to-r from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader - Standardized card header section
 */
type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={clsx(
        "mb-4 sm:mb-5",
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardTitle - Standardized card title
 */
type CardTitleProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  children?: React.ReactNode;
  className?: string;
};

export function CardTitle({
  children,
  className,
  as: Component = "h3",
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={clsx(
        "text-base font-semibold text-gray-900 dark:text-slate-100 sm:text-lg",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * CardContent - Standardized card content section
 */
export function CardContent({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={clsx("space-y-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardFooter - Standardized card footer section
 */
export function CardFooter({ children, className, ...props }: CardSectionProps) {
  return (
    <div
      className={clsx(
        "mt-4 sm:mt-5",
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// For convenience, we can also provide pre-styled Typography components
// if we find that we need more complex titles/descriptions often.
// However, for now, we will rely on passing Typography into the CardHeader.

/*
  Example Usage:

  import Card, { CardHeader, CardContent } from "./Card";
  import Typography from "@mui/material/Typography";

  <Card>
    <CardHeader
      title={
        <Typography variant="h6" component="h2">
          Card Title
        </Typography>
      }
      subheader={
        <Typography variant="body2" color="text.secondary">
          Card Subheader/Description
        </Typography>
      }
    />
    <CardContent>
      <Typography variant="body1">
        This is the body of the card.
      </Typography>
    </CardContent>
  </Card>
*/
