import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-border bg-secondary text-foreground",
    secondary: "border-border bg-[#1F1F1F] text-foreground",
    destructive: "border-destructive/30 bg-destructive/10 text-destructive",
    outline: "border-border bg-transparent text-foreground"
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    />
  );
}
