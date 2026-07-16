"use client";

import { useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { Check, MessageSquareQuote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageBackBar } from "@/components/page-back-link";
import { Reveal } from "@/components/ui/reveal";
import { FormError } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HoneypotField } from "@/components/ui/honeypot-field";
import { StarRating } from "@/components/ui/star-rating";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/turnstile-widget";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { brand } from "@/lib/brand";
import { isHoneypotTriggered } from "@/lib/form-validation";
import { cn } from "@/lib/utils";
import {
  createReviewFormSchema,
  reviewFormDefaultValues,
  type ReviewFormValues,
} from "@/lib/review-form-schema";
import { REVIEW_LIMITS } from "@/lib/review-schema";
import { REVIEW_MODAL_TITLE_ID } from "@/lib/modal-a11y-ids";
import { routes } from "@/lib/routes";
import {
  translateValidationError,
  ValidationErrors,
  type ValidationErrorKey,
} from "@/lib/validation-errors";
import { showAppToast } from "@/lib/app-toast";

const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

type ReviewFormPageProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
};

function ReviewFormBody({ variant = "page" }: ReviewFormPageProps) {
  const t = useTranslations("reviewForm");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("validation");
  const translateError = (key: ValidationErrorKey) => tValidation(key);
  const schema = useMemo(
    () => createReviewFormSchema(translateError),
    [tValidation]
  );
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const { loading, setLoading, trySubmit } = useSubmitGuard();
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(schema),
    defaultValues: reviewFormDefaultValues,
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
      email: values.email || undefined,
      role: values.role || undefined,
      rating: values.rating,
      message: values.message,
      _honeypot: values._honeypot ?? "",
      ...(turnstileToken ? { turnstileToken } : {}),
    };

    setLoading(true);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSent(true);
        return;
      }

      // Pas de fallback mailto (ouvre Outlook / dialogue Windows).
      if (res.status === 502 || res.status === 503) {
        const message = tValidation("sendFailed");
        setSubmitError(message);
        showAppToast(message, "error");
        turnstileRef.current?.reset();
        return;
      }

      const resBody = (await res.json().catch(() => null)) as { error?: string } | null;
      const fallbackKey =
        res.status === 429
          ? ValidationErrors.reviewIpRateLimited
          : res.status === 409
            ? ValidationErrors.reviewAlreadySubmitted
            : ValidationErrors.checkFields;
      const message = translateValidationError(
        resBody?.error,
        translateError,
        fallbackKey
      );
      setSubmitError(message);
      showAppToast(
        message,
        res.status === 429 || res.status === 409 ? "info" : "error"
      );
      turnstileRef.current?.reset();
    } catch {
      const message = tValidation("networkError");
      setSubmitError(message);
      showAppToast(message, "error");
      turnstileRef.current?.reset();
    } finally {
      setLoading(false);
    }
  });

  const isModal = variant === "modal";

  return (
    <section
      className={cn(
        "relative overflow-x-clip bg-background",
        isModal ? "py-0" : "pb-20 sm:pb-24 lg:pb-28"
      )}
    >
      {!isModal && (
        <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,var(--color-primary),transparent_60%)] opacity-10 blur-3xl" />
      )}

      {!isModal && <PageBackBar href={routes.reviews} label={t("backToReviews")} />}

      <div className={cn("mx-auto max-w-3xl px-4 sm:px-6", isModal && "max-w-none px-0")}>
        <Reveal delay={0.05}>
          <div
            className={cn(
              isModal
                ? "pt-8"
                : "mt-8 overflow-hidden rounded-2xl border border-step-accent/20 bg-card/70 p-5 backdrop-blur-sm sm:rounded-3xl sm:p-8 md:p-10"
            )}
          >
            <div className="text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-step-accent/30 bg-background/60 px-4 py-1 text-xs font-medium uppercase tracking-widest text-step-accent">
                <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden />
                {t("eyebrow")}
              </span>
              <h1
                id={isModal ? REVIEW_MODAL_TITLE_ID : undefined}
                className={cn(
                  "mt-4 font-display-serif font-semibold tracking-tight",
                  isModal ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
                )}
              >
                {t("title")}{" "}
                <span className="text-gradient">{t("titleHighlight")}</span>
              </h1>
              <p
                className={cn(
                  "text-foreground/60",
                  isModal ? "mt-3 text-sm" : "mt-4 text-sm sm:text-base"
                )}
              >
                {t("subtitle", { name: brand.name })}
              </p>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-8 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
                  <Check className="h-6 w-6" aria-hidden />
                </span>
                <p className="text-lg font-medium">{t("successTitle")}</p>
                <p className="text-sm text-foreground/55">{t("successBody")}</p>
                <Button asChild variant="outline" className="mt-2">
                  <Link href={routes.home}>{tCommon("backHome")}</Link>
                </Button>
              </motion.div>
            ) : (
              <form
                onSubmit={onSubmit}
                noValidate
                className={cn(
                  "relative flex w-full flex-col",
                  isModal ? "mt-6 gap-4" : "mt-10 gap-5"
                )}
                aria-label={t("formAria")}
              >
                <HoneypotField {...register("_honeypot")} />

                <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    id="review-name"
                    label={t("name")}
                    required
                    error={errors.name?.message}
                  >
                    <Input
                      id="review-name"
                      autoComplete="name"
                      maxLength={REVIEW_LIMITS.nameMax}
                      placeholder={t("namePlaceholder")}
                      spellCheck={false}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "review-name-error" : undefined}
                      {...register("name")}
                    />
                  </FormField>

                  <FormField
                    id="review-email"
                    label={t("email")}
                    error={errors.email?.message}
                  >
                    <Input
                      id="review-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={REVIEW_LIMITS.emailMax}
                      placeholder={t("emailPlaceholder")}
                      spellCheck={false}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "review-email-error" : undefined}
                      {...register("email")}
                    />
                  </FormField>
                </div>

                <FormField
                  id="review-role"
                  label={t("role")}
                  error={errors.role?.message}
                  className="w-full"
                >
                  <Input
                    id="review-role"
                    autoComplete="organization"
                    maxLength={REVIEW_LIMITS.roleMax}
                    placeholder={t("rolePlaceholder")}
                    spellCheck={false}
                    aria-invalid={Boolean(errors.role)}
                    aria-describedby={errors.role ? "review-role-error" : undefined}
                    {...register("role")}
                  />
                </FormField>

                <Controller
                  name="rating"
                  control={control}
                  render={({ field }) => (
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.rating?.message}
                    />
                  )}
                />

                <FormField
                  id="review-message"
                  label={t("review")}
                  required
                  error={errors.message?.message}
                  className="w-full"
                >
                  <Textarea
                    id="review-message"
                    rows={isModal ? 4 : 5}
                    maxLength={REVIEW_LIMITS.messageMax}
                    autoComplete="off"
                    placeholder={t("messagePlaceholder")}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? "review-message-error" : undefined}
                    {...register("message")}
                  />
                </FormField>

                <FormError id="review-form-error" message={submitError} />

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

                <p className="text-center text-xs text-foreground/45">{t("consent")}</p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ReviewFormPage(props: ReviewFormPageProps) {
  const locale = useLocale();

  return <ReviewFormBody key={locale} {...props} />;
}
