"use client";

import { useCallback, useRef, useState } from "react";

const MIN_SUBMIT_INTERVAL_MS = 3_000;

type SubmitGuardResult =
  | { allowed: true }
  | { allowed: false; reason: "loading" | "cooldown" };

export function useSubmitGuard() {
  const [loading, setLoading] = useState(false);
  const lastSubmitAt = useRef(0);

  const trySubmit = useCallback((): SubmitGuardResult => {
    if (loading) return { allowed: false, reason: "loading" };
    const now = Date.now();
    if (now - lastSubmitAt.current < MIN_SUBMIT_INTERVAL_MS) {
      return { allowed: false, reason: "cooldown" };
    }
    lastSubmitAt.current = now;
    return { allowed: true };
  }, [loading]);

  return { loading, setLoading, trySubmit };
}

export function getSubmitCooldownMessage(): string {
  return "Veuillez patienter quelques secondes avant de renvoyer.";
}
