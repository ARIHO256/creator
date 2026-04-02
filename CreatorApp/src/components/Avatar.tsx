import React from "react";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  src?: string;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export const Avatar: React.FC<AvatarProps> = ({ 
  name, 
  size = "md", 
  src,
  className = "" 
}) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-evz-orange text-white flex items-center justify-center font-semibold ${className}`}
      title={name}
    >
      {initials}
    </div>
  );
};

