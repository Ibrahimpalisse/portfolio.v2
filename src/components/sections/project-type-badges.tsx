"use client";

import { useTranslations } from "next-intl";
import { getProjectBusinessType } from "@/data/project-business-type-icons";
import { isProjectBusinessTypeId } from "@/data/project-business-types";
import { cn } from "@/lib/utils";

type ProjectTypeBadgesProps = {
  businessTypeIds?: string[];
  /** Fallback texte si pas d’ids (legacy). */
  tags?: string[];
  className?: string;
};

export function ProjectTypeBadges({
  businessTypeIds,
  tags,
  className,
}: ProjectTypeBadgesProps) {
  const t = useTranslations("projects.businessTypes");

  if (businessTypeIds && businessTypeIds.length > 0) {
    return (
      <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
        {businessTypeIds.map((id) => {
          const type = getProjectBusinessType(id);
          if (!type) return null;
          const Icon = type.Icon;
          const label = isProjectBusinessTypeId(id) ? t(id) : type.label;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground/60"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (!tags?.length) return null;

  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      {tags.map((label) => (
        <span
          key={label}
          className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-foreground/60"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
