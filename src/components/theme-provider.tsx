"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readStoredThemeSetting,
  resolveThemeSetting,
  THEME_DEFAULT,
  THEME_STORAGE_KEY,
  writeThemeCookie,
  type ResolvedTheme,
  type ThemeSetting,
} from "@/lib/theme-storage";

type ThemeContextValue = {
  theme?: ThemeSetting;
  setTheme: (theme: ThemeSetting) => void;
  resolvedTheme?: ResolvedTheme;
  systemTheme?: ResolvedTheme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme, disableTransition: boolean) {
  const root = document.documentElement;

  if (disableTransition) {
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode("*,*::before,*::after{transition:none!important}")
    );
    document.head.appendChild(style);
    window.getComputedStyle(document.body);
    setTimeout(() => document.head.removeChild(style), 1);
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  writeThemeCookie(resolved);
}

type ThemeProviderProps = {
  children: ReactNode;
  initialResolved?: ResolvedTheme;
  defaultTheme?: ThemeSetting;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({
  children,
  initialResolved = THEME_DEFAULT as ResolvedTheme,
  defaultTheme = THEME_DEFAULT as ThemeSetting,
  storageKey = THEME_STORAGE_KEY,
  enableSystem = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeSetting | undefined>(undefined);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme | undefined>(
    initialResolved
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme | undefined>(
    undefined
  );

  useEffect(() => {
    const stored = readStoredThemeSetting(defaultTheme);
    const system = getSystemTheme();
    setThemeState(stored);
    setSystemTheme(system);

    const resolved = resolveThemeSetting(stored, enableSystem, system);
    setResolvedTheme(resolved);
    applyTheme(resolved, disableTransitionOnChange);
  }, [defaultTheme, enableSystem, disableTransitionOnChange, storageKey]);

  useEffect(() => {
    if (theme === undefined || systemTheme === undefined) return;

    const resolved = resolveThemeSetting(theme, enableSystem, systemTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved, disableTransitionOnChange);
  }, [theme, systemTheme, enableSystem, disableTransitionOnChange]);

  useEffect(() => {
    const mq = window.matchMedia(SYSTEM_QUERY);
    const onChange = () => {
      const sys = mq.matches ? "dark" : "light";
      setSystemTheme(sys);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback(
    (next: ThemeSetting) => {
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, systemTheme }),
    [theme, setTheme, resolvedTheme, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  return ctx ?? { setTheme: () => {} };
}

export type { ThemeSetting, ResolvedTheme };
