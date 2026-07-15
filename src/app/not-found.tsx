import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-20 text-foreground">
      <div className="mx-auto max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-primary">
          <FileQuestion className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-6 text-xs font-medium uppercase tracking-widest text-foreground/45">
          Erreur 404
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Page introuvable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/60 sm:text-base">
          Cette page n&apos;existe pas ou a été déplacée. Retournez à
          l&apos;accueil pour continuer votre visite.
        </p>
        <Button asChild className="mt-8" size="lg">
          <Link href={routes.home}>Retour à l&apos;accueil</Link>
        </Button>
      </div>
    </div>
  );
}
