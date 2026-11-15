import type { HTMLAttributes, ReactNode } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: "income" | "expense" | "pending" | "neutral" | "brand";
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  const variantStyles = {
    income: "bg-[#eef7f2] text-[#1b6e44] border border-[#c2ded0]",
    expense: "bg-[#fdf4f4] text-[#b33a3a] border border-[#f5cece]",
    pending: "bg-[#fef7ee] text-[#b86214] border border-[#f5dfc6]",
    neutral: "bg-[#f4efe6] text-[#4a554e] border border-[#ded7cb]",
    brand: "bg-[#152e22] text-[#dbe9e0] border border-[#1f3d30]",
  };

  const dotColors = {
    income: "bg-[#1b6e44]",
    expense: "bg-[#b33a3a]",
    pending: "bg-[#b86214]",
    neutral: "bg-[#64756a]",
    brand: "bg-[#5bc48a]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
}
