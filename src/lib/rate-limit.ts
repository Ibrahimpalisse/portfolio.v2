import {
  checkRateLimitInStore,
  pruneRateLimitStore,
  RATE_LIMIT_WINDOW_MS,
} from "@/lib/rate-limit-core";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

export { getClientIp } from "@/lib/rate-limit-core";

export function checkRateLimit(key: string) {
  return checkRateLimitInStore(store, key);
}

if (typeof setInterval !== "undefined") {
  setInterval(() => pruneRateLimitStore(store), RATE_LIMIT_WINDOW_MS);
}
