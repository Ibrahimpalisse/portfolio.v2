"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Mail, Send, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ContactOpenLink } from "@/components/contact-open-link";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoneypotField } from "@/components/ui/honeypot-field";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { brand } from "@/lib/brand";
import { CONTACT_LIMITS } from "@/lib/contact-schema";
import {
  contactFormDefaultValues,
  createContactFormSchema,
  type ContactFormValues,
} from "@/lib/contact-form-schema";
import {
  buildSafeMailtoUrl,
  isHoneypotTriggered,
  sanitizeForMailtoHeader,
} from "@/lib/form-validation";
import { CONTACT_MODAL_TITLE_ID } from "@/lib/modal-a11y-ids";
import {
  translateValidationError,
  ValidationErrors,
  type ValidationErrorKey,
} from "@/lib/validation-errors";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export function ContactForm() {
  const t = useTranslations("contact");
  const tValidation = useTranslations("validation");
  const translateError = (key: ValidationErrorKey) => tValidation(key);
  const schema = useMemo(
    () => createContactFormSchema(translateError),
    [tValidation]
  );
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const { loading, setLoading, trySubmit } = useSubmitGuard();
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: contactFormDefaultValues,
    mode: "onBlur",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");

    const guard = trySubmit();
    if (!guard.allowed) {
      if (guard.reason === "cooldown") {
        setSubmitError(tValidation("cooldown"));
      }
      return;
    }

    if (isHoneypotTriggered(values._honeypot)) {
      setSent(true);
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      setSubmitError(t("turnstileError"));
      return;
    }

    const payload = {
      name: values.name,
      email: values.email,
      message: values.message,
      _honeypot: values._honeypot ?? "",
      ...(turnstileToken ? { turnstileToken } : {}),
    };

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSent(true);
        return;
      }

      if (res.status === 502 || res.status === 503) {
        const subject = sanitizeForMailtoHeader(
          `Demande de projet — ${values.name}`,
          200
        );
        const body = sanitizeForMailtoHeader(
          `${values.message}\n\n— ${values.name}\n${values.email}`,
          1500
        );
        const mailto = buildSafeMailtoUrl(brand.email, subject, body);

        if (mailto) {
          window.location.href = mailto;
          setSent(true);
          return;
        }

        setSubmitError(tValidation("mailTooLong"));
        return;
      }

      const resBody = (await res.json().catch(() => null)) as { error?: string } | null;
      setSubmitError(
        translateValidationError(
          resBody?.error,
          translateError,
          res.status === 429 ? ValidationErrors.rateLimited : ValidationErrors.checkFields
        )
      );
      turnstileRef.current?.reset();
    } catch {
      setSubmitError(tValidation("networkError"));
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  });

  return (
    <>
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-step-accent/30 bg-background/60 px-4 py-1 text-xs font-medium uppercase tracking-widest text-step-accent">
          <Mail className="h-3.5 w-3.5" aria-hidden /> {t("eyebrow")}
        </span>
        <h2
          id={CONTACT_MODAL_TITLE_ID}
          className="mt-4 font-display-serif text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("title")} <span className="text-gradient">{t("titleHighlight")}</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/60">
          {t("subtitle")}
        </p>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-8 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
            <Check className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-lg font-medium">{t("successTitle")}</p>
          <p className="text-sm text-foreground/55">{t("successBody")}</p>
        </motion.div>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="relative mt-6 flex w-full flex-col gap-4"
          aria-label={t("formAria")}
        >
          <HoneypotField {...register("_honeypot")} />

          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              id="contact-name"
              label={t("name")}
              required
              error={errors.name?.message}
            >
              <Input
                id="contact-name"
                autoComplete="name"
                maxLength={CONTACT_LIMITS.nameMax}
                placeholder={t("namePlaceholder")}
                spellCheck={false}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "contact-name-error" : undefined}
                {...register("name")}
              />
            </FormField>

            <FormField
              id="contact-email"
              label={t("email")}
              required
              error={errors.email?.message}
            >
              <Input
                id="contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={CONTACT_LIMITS.emailMax}
                placeholder={t("emailPlaceholder")}
                spellCheck={false}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "contact-email-error" : undefined}
                {...register("email")}
              />
            </FormField>
          </div>

          <FormField
            id="contact-message"
            label={t("message")}
            required
            error={errors.message?.message}
            className="w-full"
          >
            <Textarea
              id="contact-message"
              rows={5}
              maxLength={CONTACT_LIMITS.messageMax}
              autoComplete="off"
              placeholder={t("messagePlaceholder")}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "contact-message-error" : undefined}
              {...register("message")}
            />
          </FormField>

          <FormError id="contact-form-error" message={submitError} />

          {turnstileEnabled && (
            <TurnstileWidget
              ref={turnstileRef}
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
            />
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? t("sending") : t("send")}
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-foreground/50 break-all sm:text-sm sm:break-normal">
        {t("orEmail")}{" "}
        <a
          href={`mailto:${brand.email}`}
          className="text-primary hover:underline"
        >
          {brand.email}
        </a>
      </p>
    </>
  );
}

export function Contact() {
  const t = useTranslations("contact");

  return (
    <section
      id="contact"
      className="relative bg-step-surface px-4 py-20 sm:px-6 sm:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(400px,80vw)] w-[min(700px,120vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--color-step-accent),transparent_60%)] opacity-15 blur-3xl" />

      <Reveal>
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-step-accent/20 bg-card/70 p-5 text-center backdrop-blur-sm sm:rounded-3xl sm:p-8 md:p-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-step-accent/30 bg-background/60 px-4 py-1 text-xs font-medium uppercase tracking-widest text-step-accent">
            <Mail className="h-3.5 w-3.5" aria-hidden /> {t("eyebrow")}
          </span>
          <h2 className="mt-4 font-display-serif text-3xl font-semibold tracking-tight sm:mt-5 sm:text-4xl md:text-5xl">
            {t("title")}{" "}
            <span className="text-gradient">{t("titleHighlight")}</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-foreground/60 sm:mt-5 sm:text-lg">
            {t("subtitle")}
          </p>

          <Button asChild size="lg" className="mt-8 w-full sm:mt-10 sm:w-auto">
            <ContactOpenLink>
              <MessageSquare className="h-4 w-4" aria-hidden />
              {t("openForm")}
            </ContactOpenLink>
          </Button>

          <p className="mt-6 text-xs text-foreground/50 break-all sm:text-sm sm:break-normal">
            {t("orEmail")}{" "}
            <a
              href={`mailto:${brand.email}`}
              className="text-primary hover:underline"
            >
              {brand.email}
            </a>
          </p>
        </div>
      </Reveal>
    </section>
  );
}
