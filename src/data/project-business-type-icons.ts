"use client";

import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  CalendarCheck,
  LayoutDashboard,
  LayoutTemplate,
  MoreHorizontal,
  Newspaper,
  PanelTop,
  ShoppingCart,
  Store,
} from "lucide-react";
import {
  PROJECT_BUSINESS_TYPE_DEFS,
  type ProjectBusinessTypeId,
  getProjectBusinessTypeDef,
} from "@/data/project-business-types";

const ICONS: Record<ProjectBusinessTypeId, LucideIcon> = {
  showcase: LayoutTemplate,
  ecommerce: ShoppingCart,
  booking: CalendarCheck,
  landing: PanelTop,
  dashboard: LayoutDashboard,
  webapp: AppWindow,
  blog: Newspaper,
  marketplace: Store,
  other: MoreHorizontal,
};

export type ProjectBusinessType = {
  id: ProjectBusinessTypeId;
  label: string;
  Icon: LucideIcon;
};

export const PROJECT_BUSINESS_TYPES: readonly ProjectBusinessType[] =
  PROJECT_BUSINESS_TYPE_DEFS.map((def) => ({
    ...def,
    Icon: ICONS[def.id],
  }));

export function getProjectBusinessType(
  id: string
): ProjectBusinessType | undefined {
  const def = getProjectBusinessTypeDef(id);
  if (!def) return undefined;
  return { ...def, Icon: ICONS[def.id] };
}
