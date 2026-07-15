import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandNameProps = {
  className?: string;
  /** Nombre de caractères visibles (effet machine à écrire). */
  length?: number;
  /** Hero typewriter : signature Allura. Reste du site : serif. */
  variant?: "signature" | "modern";
};

export function BrandName({
  className,
  length,
  variant = "signature",
}: BrandNameProps) {
  const visible =
    length === undefined ? brand.name : brand.name.slice(0, Math.min(length, brand.name.length));

  return (
    <span
      translate="no"
      suppressHydrationWarning
      className={cn(
        "notranslate inline-block whitespace-nowrap leading-none text-foreground",
        variant === "signature"
          ? "font-name font-normal tracking-[0.02em] sm:tracking-wide"
          : "font-display-serif font-medium tracking-tight",
        className
      )}
    >
      {visible}
    </span>
  );
}
