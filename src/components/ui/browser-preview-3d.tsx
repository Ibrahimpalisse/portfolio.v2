"use client";

import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

type BrowserPreview3DProps = {
  image: string;
  title: string;
  className?: string;
};

export function BrowserPreview3D({
  image,
  title,
  className,
}: BrowserPreview3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [14, -14]), {
    stiffness: 180,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-14, 14]), {
    stiffness: 180,
    damping: 22,
  });

  function handleMove(clientX: number, clientY: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((clientX - rect.left) / rect.width - 0.5);
    y.set((clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div
      ref={ref}
      className={cn("perspective-[1400px] overflow-hidden py-2", className)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseLeave={handleLeave}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={handleLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative mx-auto w-full max-w-full sm:max-w-3xl lg:max-w-4xl"
      >
        <div
          className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)] sm:rounded-xl sm:shadow-[0_40px_80px_-24px_rgba(0,0,0,0.35)]"
          style={{ transform: "translateZ(40px)" }}
        >
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2 sm:gap-2 sm:px-4 sm:py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-border sm:h-3 sm:w-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-border sm:h-3 sm:w-3" />
            <span className="h-2.5 w-2.5 rounded-full bg-border sm:h-3 sm:w-3" />
            <div className="mx-auto h-5 w-1/2 max-w-xs rounded-md bg-background/80 sm:h-6" />
          </div>
          <div className="relative aspect-[16/10] w-full bg-muted">
            <Image
              src={image}
              alt={`Aperçu du site ${title}`}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
              priority
            />
          </div>
        </div>

        <div
          aria-hidden
          className="absolute bottom-0 left-[10%] right-[10%] h-6 rounded-[100%] bg-black/10 blur-xl"
          style={{ transform: "translateZ(-20px) rotateX(90deg)" }}
        />
      </motion.div>
    </div>
  );
}
