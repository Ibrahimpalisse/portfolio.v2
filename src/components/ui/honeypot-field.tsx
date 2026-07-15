import * as React from "react";
import { cn } from "@/lib/utils";

/** Champ honeypot anti-bot — invisible pour les utilisateurs, piège pour les scrapers. */
export const HoneypotField = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function HoneypotField({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      {...props}
      className={cn(
        "pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0",
        className
      )}
    />
  );
});
