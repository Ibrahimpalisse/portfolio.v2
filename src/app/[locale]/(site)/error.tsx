"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-primary">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
        Une erreur est survenue
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60 sm:text-base">
        Impossible d&apos;afficher cette page pour le moment. Réessayez dans
        quelques instants.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href={routes.home}>Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
