import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-xl border border-border bg-background/50 px-4 text-sm outline-none transition-colors",
        "placeholder:text-foreground/40",
        "focus:border-step-accent focus:ring-2 focus:ring-step-accent/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/15",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
