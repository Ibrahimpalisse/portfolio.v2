"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  /** Style intégré dans la barre d’actions de la navbar. */
  embedded?: boolean;
};

export function ThemeToggle({ className, embedded }: ThemeToggleProps) {
  const t = useTranslations("common");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={cn(
        "flex shrink-0 items-center justify-center text-foreground/60 transition-colors hover:bg-muted/70 hover:text-foreground",
        embedded
          ? "h-8 w-8 rounded-full"
          : "h-9 w-9 rounded-lg border border-border sm:h-10 sm:w-10",
        className
      )}
      aria-label={
        mounted
          ? isDark
            ? t("themeLight")
            : t("themeDark")
          : t("themeToggle")
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
