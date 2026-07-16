"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { AdminPasswordChangeButton } from "@/components/admin/admin-password-change-form";
import { Button } from "@/components/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/constants";

export function AdminHeaderActions() {
  const t = useTranslations("admin.dashboard");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={ADMIN_ROUTES.settings}>
          <Settings className="h-4 w-4" aria-hidden />
          {t("openSettings")}
        </Link>
      </Button>
      <AdminPasswordChangeButton />
      <AdminLogoutButton />
    </div>
  );
}
