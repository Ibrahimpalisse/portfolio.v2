"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { BrandName } from "@/components/brand-name";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  showSubtitle?: boolean;
  showAvatar?: boolean;
  subtitleClassName?: string;
};

export function BrandLogo({
  className,
  showSubtitle = false,
  showAvatar = true,
  subtitleClassName,
}: BrandLogoProps) {
  const t = useTranslations("hero");

  return (
    <div className={cn("notranslate flex min-w-0 items-center gap-2.5 sm:gap-3", className)}>
      {showAvatar && (
        <span
          className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-profile ring-1 ring-foreground/5 sm:h-9 sm:w-9"
          aria-hidden
        >
          <Image
            src={brand.profileImage}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 640px) 32px, 36px"
            priority
          />
        </span>
      )}

      <div className="min-w-0 leading-none">
        <BrandName variant="modern" className="truncate text-[13px] sm:text-sm" />
        {showSubtitle && (
          <span
            className={cn(
              "mt-1 block truncate text-[10px] font-normal leading-snug text-foreground/45 sm:text-[11px]",
              subtitleClassName
            )}
          >
            {t("tagline")}
          </span>
        )}
      </div>
    </div>
  );
}

export function BrandLogoFooter() {
  const t = useTranslations("hero");

  return (
    <div className="notranslate flex items-center gap-2.5">
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-profile">
        <Image
          src={brand.profileImage}
          alt=""
          fill
          className="object-cover object-center"
          sizes="36px"
        />
      </span>
      <div className="min-w-0 leading-none">
        <BrandName variant="modern" className="text-sm" />
        <span className="mt-1 block text-xs font-normal text-foreground/45">
          {t("tagline")}
        </span>
      </div>
    </div>
  );
}
