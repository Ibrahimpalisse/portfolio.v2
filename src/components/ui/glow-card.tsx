"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function GlowCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  function updatePos(clientX: number, clientY: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: clientX - rect.left, y: clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        updatePos(e.clientX, e.clientY);
        setActive(true);
      }}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-step-accent/20 bg-card/80 p-5 backdrop-blur-sm transition-colors duration-300 hover:border-step-accent/45 sm:p-6",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(280px circle at ${pos.x}px ${pos.y}px, color-mix(in srgb, var(--color-step-accent) 22%, transparent), transparent 70%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
