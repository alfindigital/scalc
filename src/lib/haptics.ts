// Lightweight haptic helper. No-ops when Vibration API is unavailable,
// when the user prefers reduced motion, or on the server.
//
// Usage: haptic('light') | haptic('success') | haptic('warning') | haptic('error')

type HapticKind = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 18,
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 60, 30, 60, 30],
};

let cachedEnabled: boolean | null = null;

function hapticsEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    cachedEnabled = false;
    return false;
  }
  if (typeof navigator.vibrate !== "function") {
    cachedEnabled = false;
    return false;
  }
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cachedEnabled = false;
      return false;
    }
  } catch {
    /* noop */
  }
  cachedEnabled = true;
  return true;
}

export function haptic(kind: HapticKind = "light"): void {
  if (!hapticsEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* noop */
  }
}

// Allow other code (e.g. reduced-motion toggle) to invalidate the cache.
export function resetHapticsCache(): void {
  cachedEnabled = null;
}
