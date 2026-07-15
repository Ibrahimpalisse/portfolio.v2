import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, MessageSquareQuote, FolderKanban, PenLine } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import { isAllowedAdminEmail } from "@/lib/admin/allowlist";
import { ADMIN_ROUTES } from "@/lib/admin/constants";
import { hasAdminMfaSatisfied } from "@/lib/admin/mfa";
import { createSupabaseServerClient, getAuthenticatedUser } from "@/lib/supabase/server";
import { projects } from "@/data/projects";
import { reviews } from "@/data/reviews";
import { brand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
};

const stats = [
  {
    label: "Avis publiés",
    value: reviews.length,
    icon: MessageSquareQuote,
    hint: "Modifiable dans src/data/reviews.ts",
  },
  {
    label: "Projets portfolio",
    value: projects.length,
    icon: FolderKanban,
    hint: "Modifiable dans src/data/projects.ts",
  },
  {
    label: "Email contact",
    value: brand.email,
    icon: Mail,
    hint: "Messages reçus via Resend",
  },
];

export default async function AdminDashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user || !isAllowedAdminEmail(user.email)) {
    redirect(ADMIN_ROUTES.login);
  }

  const supabase = await createSupabaseServerClient();
  if (!(await hasAdminMfaSatisfied(supabase))) {
    redirect(`${ADMIN_ROUTES.login}?step=mfa`);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Connecté en tant que{" "}
            <span className="font-medium text-foreground/80">{user.email}</span>
          </p>
        </div>
        <AdminLogoutButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <section
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <stat.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs uppercase tracking-widest text-foreground/45">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-foreground/55">
              {stat.hint}
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <PenLine className="h-5 w-5 text-primary" aria-hidden />
          Gestion des avis
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
          Les nouveaux avis arrivent par email (API{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/api/review</code>
          ). Pour publier un avis sur le site, ajoutez-le dans{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            src/data/reviews.ts
          </code>{" "}
          puis redéployez.
        </p>
        {reviews.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-border bg-background/50 px-4 py-3 text-sm"
              >
                <p className="font-medium">
                  {review.name}
                  <span className="ml-2 text-foreground/45">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </span>
                </p>
                <p className="mt-1 line-clamp-2 text-foreground/60">{review.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-foreground/50">
            Aucun avis publié pour le moment.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Messages contact</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
          Les formulaires contact sont envoyés à{" "}
          <a
            href={`mailto:${brand.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {brand.email}
          </a>{" "}
          via Resend. Consultez votre boîte mail ou le dashboard Resend pour lire
          les messages entrants.
        </p>
        <p className="mt-4 text-sm text-foreground/55">
          Prochaine étape possible : stocker les soumissions en base Supabase pour
          les consulter ici directement.
        </p>
      </section>

      <section className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Contenu démo</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/65">
          Les projets et avis affichés sur le site sont des exemples. Remplacez-les
          par vos vraies réalisations et témoignages clients avant la mise en
          production.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full border border-border bg-background px-4 py-2 transition-colors hover:border-primary/40"
          >
            Voir le site
          </Link>
        </div>
      </section>
    </div>
  );
}
