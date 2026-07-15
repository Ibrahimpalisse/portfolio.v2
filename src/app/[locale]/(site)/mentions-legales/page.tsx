import type { Metadata } from "next";
import { PageBackBar } from "@/components/page-back-link";
import { brand } from "@/lib/brand";
import { createPageMetadata, routes } from "@/lib/routes";

export const metadata: Metadata = createPageMetadata({
  title: "Mentions légales",
  description: `Mentions légales et politique de confidentialité de ${brand.name}.`,
  path: routes.legal,
});

export default function MentionsLegalesPage() {
  return (
    <>
      <PageBackBar href={routes.home} label="Retour à l'accueil" />
      <div className="px-4 pb-20 sm:px-6 sm:pb-24">
        <article className="mx-auto mt-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Mentions légales
        </h1>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-foreground/70 sm:text-base">
          <h2 className="text-lg font-semibold text-foreground">Éditeur</h2>
          <p>
            {brand.name}
            <br />
            Email :{" "}
            <a href={`mailto:${brand.email}`} className="text-primary hover:underline">
              {brand.email}
            </a>
          </p>

          <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
          <p>
            Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133,
            Covina, CA 91723, États-Unis.
          </p>

          <h2 className="text-lg font-semibold text-foreground">
            Données personnelles
          </h2>
          <p>
            Les formulaires de contact et d&apos;avis collectent votre nom, email
            et message uniquement pour répondre à votre demande ou publier un
            avis avec votre accord. Ils sont transmis via{" "}
            <a
              href="https://resend.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Resend
            </a>{" "}
            (prestataire américain) afin de me notifier par email.
          </p>
          <p>
            Resend traite ces données en mon nom ; consultez leur{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              politique de confidentialité
            </a>
            .
          </p>
          <p>
            Base légale : exécution de votre demande (contact) ou consentement
            (publication d&apos;un avis). Durée de conservation : le temps
            nécessaire au traitement, puis suppression sur demande.
          </p>
          <p>
            Le formulaire d&apos;avis utilise{" "}
            <a
              href="https://www.cloudflare.com/fr-fr/products/turnstile/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Cloudflare Turnstile
            </a>{" "}
            pour limiter le spam. Turnstile peut déposer un cookie technique ;
            aucune donnée personnelle n&apos;est transmise à des fins publicitaires.
          </p>
          <p>
            Ces données ne sont ni revendues ni cédées à des fins commerciales,
            sauf obligation légale.
          </p>
          <p>
            Pour exercer vos droits (accès, rectification, suppression),
            contactez{" "}
            <a href={`mailto:${brand.email}`} className="text-primary hover:underline">
              {brand.email}
            </a>
            .
          </p>

          <h2 className="text-lg font-semibold text-foreground">Cookies</h2>
          <p>
            Ce site n&apos;utilise pas de cookies de tracking publicitaire. Des
            cookies techniques peuvent être déposés par l&apos;hébergeur (Vercel)
            ou par Cloudflare Turnstile lors de l&apos;envoi d&apos;un avis.
          </p>
        </section>
      </article>
      </div>
    </>
  );
}
