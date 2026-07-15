"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_ROUTES } from "@/lib/admin/constants";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      const body = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
      router.push(body?.redirectTo ?? ADMIN_ROUTES.login);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
