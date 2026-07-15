"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LOCALE_CHANGE_EVENT } from "@/lib/locale-cookie";

function runProgressAnimation(
  setVisible: (v: boolean) => void,
  setWidth: (w: number) => void,
  timers: number[]
) {
  setVisible(true);
  setWidth(12);
  timers.push(window.setTimeout(() => setWidth(55), 60));
  timers.push(window.setTimeout(() => setWidth(82), 160));
  timers.push(
    window.setTimeout(() => {
      setWidth(100);
      timers.push(
        window.setTimeout(() => {
          setVisible(false);
        }, 220)
      );
    }, 320)
  );
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const prevPath = useRef(pathname);
  const timersRef = useRef<number[]>([]);
  const skipNextPathProgress = useRef(false);

  const startProgress = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    runProgressAnimation(setVisible, setWidth, timersRef.current);
  }, []);

  useEffect(() => {
    const onLocaleChange = () => {
      skipNextPathProgress.current = true;
      startProgress();
    };
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, [startProgress]);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    if (skipNextPathProgress.current) {
      skipNextPathProgress.current = false;
      return;
    }

    startProgress();
  }, [pathname, startProgress]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 bg-border/40"
      aria-hidden
    >
      <div
        className="h-full bg-step-accent transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
