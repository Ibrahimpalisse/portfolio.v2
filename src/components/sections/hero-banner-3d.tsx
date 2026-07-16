"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { Move3D } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type HeroBanner3DProps = {
  className?: string;
};

const DRAG_SENSITIVITY = 0.55;
const DRAG_SENSITIVITY_COMPACT = 0.72;
const INITIAL_ROTATE_X = -14;
const INITIAL_ROTATE_X_COMPACT = -8;
const INITIAL_ROTATE_Y_LIGHT = 22;
const INITIAL_ROTATE_Y_DARK = INITIAL_ROTATE_Y_LIGHT + 180;
const CUBE_BLEED_COMPACT = 0.72;
const CUBE_BLEED_DESKTOP = 0.9;

type FaceVariant = "light" | "dark";

function degToRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Applique rotateZ → rotateY → rotateX (ordre CSS, appliqué de droite à gauche). */
function rotateVector(x: number, y: number, z: number, rx: number, ry: number, rz: number) {
  const cz = Math.cos(degToRad(rz));
  const sz = Math.sin(degToRad(rz));
  const x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  const z1 = z;

  const cy = Math.cos(degToRad(ry));
  const sy = Math.sin(degToRad(ry));
  const x2 = x1 * cy + z1 * sy;
  const y2 = y1;
  const z2 = -x1 * sy + z1 * cy;

  const cx = Math.cos(degToRad(rx));
  const sx = Math.sin(degToRad(rx));
  const x3 = x2;
  const y3 = y2 * cx - z2 * sx;
  const z3 = y2 * sx + z2 * cx;

  return { x: x3, y: y3, z: z3 };
}

/** Face la plus visible vers la caméra (normale avec z maximal). */
function getDominantFaceVariant(rx: number, ry: number, rz: number): FaceVariant {
  const faces: { normal: [number, number, number]; variant: FaceVariant }[] = [
    { normal: [0, 0, 1], variant: "light" },
    { normal: [0, 0, -1], variant: "dark" },
    { normal: [1, 0, 0], variant: "dark" },
    { normal: [-1, 0, 0], variant: "light" },
  ];

  let bestZ = -Infinity;
  let variant: FaceVariant = "light";

  for (const face of faces) {
    const n = rotateVector(face.normal[0], face.normal[1], face.normal[2], rx, ry, rz);
    if (n.z > bestZ) {
      bestZ = n.z;
      variant = face.variant;
    }
  }

  return variant;
}

const LIGHT_FACE_CLASS =
  "border-2 border-black/15 bg-gradient-to-br from-step-surface via-card to-step-accent/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]";
const DARK_FACE_CLASS =
  "border-2 border-black/25 bg-gradient-to-br from-zinc-800 via-zinc-900 to-step-accent/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]";

type CubeColorFaceProps = {
  size: number;
  transform: string;
  variant: FaceVariant;
  emphasizeDayHint?: boolean;
};

function CubeColorFace({
  size,
  transform,
  variant,
  emphasizeDayHint = false,
}: CubeColorFaceProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute left-0 top-0 overflow-hidden [backface-visibility:hidden]",
        variant === "light" ? LIGHT_FACE_CLASS : DARK_FACE_CLASS
      )}
      style={{ width: size, height: size, transform }}
    >
      {variant === "light" ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(251,191,36,0.22),transparent_58%)]"
          aria-hidden
        />
      ) : (
        <div
          className={cn(
            "pointer-events-none absolute -right-[8%] -top-[8%] size-[42%] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),transparent_68%)]",
            emphasizeDayHint && "bg-[radial-gradient(circle,rgba(251,191,36,0.42),transparent_62%)]"
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

export function HeroBanner3D({ className }: HeroBanner3DProps) {
  const t = useTranslations("heroCube");
  const { resolvedTheme, setTheme } = useTheme();
  const cubeSizerRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const [cubeSize, setCubeSize] = useState(0);
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(false);
  const prevThemeRef = useRef(resolvedTheme);
  const syncingThemeFromCube = useRef(false);
  const lastSyncedVariant = useRef<FaceVariant | null>(null);
  const resolvedThemeRef = useRef(resolvedTheme);

  useEffect(() => {
    resolvedThemeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  const isInteractive = !reduceMotion;
  const tiltX = isCompact ? INITIAL_ROTATE_X_COMPACT : INITIAL_ROTATE_X;

  const isDarkTheme = resolvedTheme === "dark";
  const themeRotateY = isDarkTheme ? INITIAL_ROTATE_Y_DARK : INITIAL_ROTATE_Y_LIGHT;

  const rotateX = useMotionValue(tiltX);
  const rotateY = useMotionValue(themeRotateY);
  const rotateZ = useMotionValue(0);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0, rotateZ: 0 });
  const velocity = useRef({ x: 0, y: 0, z: 0 });
  const inertiaFrame = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);
  const dragListenersTarget = useRef<HTMLDivElement | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });

  const transform = useTransform(
    [rotateX, rotateY, rotateZ],
    ([x, y, z]) => `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`
  );

  useEffect(() => {
    const el = cubeSizerRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      const bleed = isCompact ? CUBE_BLEED_COMPACT : CUBE_BLEED_DESKTOP;
      const nextSize = Math.min(width, height) * bleed;
      setCubeSize((prev) => (Math.abs(prev - nextSize) < 0.5 ? prev : nextSize));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isCompact]);

  useEffect(() => {
    const compactMq = window.matchMedia("(max-width: 639px)");

    const update = () => {
      const compact = compactMq.matches;
      setIsCompact(compact);
      isCompactRef.current = compact;
    };

    update();
    compactMq.addEventListener("change", update);
    return () => compactMq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (dragging.current) return;
    rotateX.set(tiltX);
  }, [tiltX, rotateX]);

  useEffect(() => {
    return () => {
      if (inertiaFrame.current !== null) {
        cancelAnimationFrame(inertiaFrame.current);
      }
      detachDragListeners();
    };
  }, []);

  useEffect(() => {
    if (!resolvedTheme || prevThemeRef.current === resolvedTheme) return;

    if (syncingThemeFromCube.current) {
      syncingThemeFromCube.current = false;
      prevThemeRef.current = resolvedTheme;
      lastSyncedVariant.current = resolvedTheme === "dark" ? "dark" : "light";
      return;
    }

    prevThemeRef.current = resolvedTheme;
    lastSyncedVariant.current = resolvedTheme === "dark" ? "dark" : "light";
    if (dragging.current) return;

    stopInertia();

    const targetY =
      resolvedTheme === "dark" ? INITIAL_ROTATE_Y_DARK : INITIAL_ROTATE_Y_LIGHT;

    if (reduceMotion) {
      rotateX.set(tiltX);
      rotateY.set(targetY);
      rotateZ.set(0);
      return;
    }

    animate(rotateX, tiltX, { type: "spring", stiffness: 140, damping: 22 });
    animate(rotateY, targetY, { type: "spring", stiffness: 140, damping: 22 });
    animate(rotateZ, 0, { type: "spring", stiffness: 140, damping: 22 });
  }, [resolvedTheme, reduceMotion, rotateX, rotateY, rotateZ, tiltX]);

  function syncThemeFromCubeRotation() {
    if (reduceMotion) return;

    const variant = getDominantFaceVariant(
      rotateX.get(),
      rotateY.get(),
      rotateZ.get()
    );

    if (variant === lastSyncedVariant.current) return;
    lastSyncedVariant.current = variant;

    const targetTheme = variant === "dark" ? "dark" : "light";
    if (resolvedThemeRef.current === targetTheme) return;

    syncingThemeFromCube.current = true;
    prevThemeRef.current = targetTheme;
    setTheme(targetTheme);
  }

  function stopInertia() {
    if (inertiaFrame.current !== null) {
      cancelAnimationFrame(inertiaFrame.current);
      inertiaFrame.current = null;
    }
  }

  function setHintVisible(visible: boolean) {
    hintRef.current?.classList.toggle("opacity-0", !visible);
  }

  function detachDragListeners() {
    const target = dragListenersTarget.current;
    if (!target) return;

    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", onPointerUp);
    target.removeEventListener("pointercancel", onPointerUp);
    dragListenersTarget.current = null;
  }

  function startInertia() {
    stopInertia();

    let vx = velocity.current.x;
    let vy = velocity.current.y;
    let vz = velocity.current.z;

    const step = () => {
      if (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02 && Math.abs(vz) < 0.02) {
        inertiaFrame.current = null;
        syncThemeFromCubeRotation();
        return;
      }

      rotateY.set(rotateY.get() + vx);
      rotateX.set(rotateX.get() + vy);
      rotateZ.set(rotateZ.get() + vz);

      syncThemeFromCubeRotation();

      vx *= 0.92;
      vy *= 0.92;
      vz *= 0.92;

      inertiaFrame.current = requestAnimationFrame(step);
    };

    inertiaFrame.current = requestAnimationFrame(step);
  }

  function getDragSensitivity() {
    return isCompactRef.current ? DRAG_SENSITIVITY_COMPACT : DRAG_SENSITIVITY;
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging.current || activePointerId.current !== event.pointerId) return;

    event.preventDefault();

    const sensitivity = getDragSensitivity();
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;

    if (event.shiftKey) {
      rotateZ.set(dragStart.current.rotateZ + dx * sensitivity);
    } else {
      rotateY.set(dragStart.current.rotateY + dx * sensitivity);
      rotateX.set(dragStart.current.rotateX - dy * sensitivity);
    }

    const mx =
      event.movementX !== 0 ? event.movementX : event.clientX - lastPointer.current.x;
    const my =
      event.movementY !== 0 ? event.movementY : event.clientY - lastPointer.current.y;

    lastPointer.current = { x: event.clientX, y: event.clientY };

    velocity.current = {
      x: mx * sensitivity,
      y: -my * sensitivity,
      z: event.shiftKey ? mx * sensitivity : 0,
    };

    syncThemeFromCubeRotation();
  }

  function onPointerUp(event: PointerEvent) {
    if (activePointerId.current !== event.pointerId) return;

    dragging.current = false;
    activePointerId.current = null;

    const target = dragListenersTarget.current;
    if (target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    target?.classList.remove("cursor-grabbing");
    target?.classList.add("cursor-grab");
    setHintVisible(true);
    detachDragListeners();
    syncThemeFromCubeRotation();
    startInertia();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isInteractive) return;

    event.preventDefault();
    stopInertia();

    const target = event.currentTarget;
    dragging.current = true;
    activePointerId.current = event.pointerId;
    dragListenersTarget.current = target;
    lastPointer.current = { x: event.clientX, y: event.clientY };

    target.setPointerCapture(event.pointerId);
    target.classList.remove("cursor-grab");
    target.classList.add("cursor-grabbing");
    setHintVisible(false);

    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      rotateX: rotateX.get(),
      rotateY: rotateY.get(),
      rotateZ: rotateZ.get(),
    };

    velocity.current = { x: 0, y: 0, z: 0 };

    const passiveOpts = { passive: false } as const;
    target.addEventListener("pointermove", onPointerMove, passiveOpts);
    target.addEventListener("pointerup", onPointerUp, passiveOpts);
    target.addEventListener("pointercancel", onPointerUp, passiveOpts);
  }

  const half = cubeSize / 2;
  const ready = cubeSize > 0;
  const hintText = t("dragHint");
  const cubeFaceProps = {
    size: cubeSize,
    emphasizeDayHint: isDarkTheme,
  };

  return (
    <div
      className={cn(
        "relative w-full select-none overflow-visible px-1 py-2 sm:px-3 sm:py-10",
        className
      )}
    >
      {!reduceMotion && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,var(--color-step-accent),transparent_62%)] opacity-25 blur-3xl"
        />
      )}

      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,14rem)] overflow-visible sm:max-w-none sm:aspect-[16/10] [perspective:1000px]">
        <div
          ref={cubeSizerRef}
          className={cn(
            "absolute inset-[6%] flex items-center justify-center sm:inset-[5%]",
            isInteractive && "touch-none cursor-grab active:cursor-grabbing"
          )}
          style={isInteractive ? { touchAction: "none" } : undefined}
          onPointerDown={handlePointerDown}
          role="img"
          aria-label={t("ariaLabel")}
        >
          {ready && (
            <motion.div
              className="relative will-change-transform [transform-style:preserve-3d]"
              style={{
                width: cubeSize,
                height: cubeSize,
                transform: reduceMotion
                  ? `rotateX(${tiltX}deg) rotateY(${themeRotateY}deg)`
                  : transform,
              }}
            >
              <CubeColorFace
                {...cubeFaceProps}
                variant="light"
                transform={`translateZ(${half}px)`}
              />

              <CubeColorFace
                {...cubeFaceProps}
                variant="dark"
                transform={`rotateY(180deg) translateZ(${half}px)`}
              />

              <CubeColorFace
                {...cubeFaceProps}
                variant="dark"
                transform={`rotateY(90deg) translateZ(${half}px)`}
              />

              <CubeColorFace
                {...cubeFaceProps}
                variant="light"
                transform={`rotateY(-90deg) translateZ(${half}px)`}
              />

              <CubeColorFace
                {...cubeFaceProps}
                variant="light"
                transform={`rotateX(90deg) translateZ(${half}px)`}
              />

              <CubeColorFace
                {...cubeFaceProps}
                variant="dark"
                transform={`rotateX(-90deg) translateZ(${half}px)`}
              />
            </motion.div>
          )}
        </div>
      </div>

      <p
        ref={hintRef}
        className="mx-auto mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-foreground/45 transition-opacity duration-200 sm:text-sm"
      >
        <Move3D className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span>{hintText}</span>
      </p>
    </div>
  );
}
