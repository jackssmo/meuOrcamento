import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: "surface" | "parchment";
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  children,
  variant = "surface",
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const variantStyles = {
    surface: "bg-white border border-[#e8e1d5] shadow-[0_1px_3px_rgba(27,41,32,0.02),0_4px_12px_rgba(27,41,32,0.02)]",
    parchment: "bg-[#f4efe6] border border-[#e8e1d5]",
  };

  const paddingStyles = {
    none: "",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-150 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[#1b2920] tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#64756a] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
