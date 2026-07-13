// Manual reduced-motion preference. Users can override the OS
// `prefers-reduced-motion` setting from the Settings panel.
//
// Effective state is written to `html[data-pyscal-motion-effective]`
// ("reduce" | "normal") and CSS keys off that attribute — no @media
// gating — so a manual override takes effect immediately without a
// page reload. The chosen mode ("auto" | "reduce" | "normal") is
// stored in `html[data-pyscal-motion]` and localStorage.

export type MotionSetting = "auto" | "reduce" | "normal";
export type MotionEffective = "reduce" | "normal";

const STORAGE_KEY = "pyscal_motion";
const EVENT = "pyscal:motion";

export function getMotionSetting(): MotionSetting {
  if (typeof document === "undefined") return "auto";
  const attr = document.documentElement.getAttribute("data-pyscal-motion");
  if (attr === "reduce" || attr === "normal" || attr === "auto") return attr;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "reduce" || saved === "normal" || saved === "auto") return saved;
  } catch {}
  return "auto";
}

function osPrefersReduce(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function computeEffective(setting: MotionSetting): MotionEffective {
  if (setting === "reduce") return "reduce";
  if (setting === "normal") return "normal";
  return osPrefersReduce() ? "reduce" : "normal";
}

function apply(setting: MotionSetting) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-pyscal-motion", setting);
  html.setAttribute("data-pyscal-motion-effective", computeEffective(setting));
}

export function setMotionSetting(setting: MotionSetting) {
  try { localStorage.setItem(STORAGE_KEY, setting); } catch {}
  apply(setting);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: setting }));
  }
}

// Subscribe to changes from any source: this tab, other tabs, or the OS
// media query when the user is in "auto" mode.
export function subscribeMotion(fn: (eff: MotionEffective, setting: MotionSetting) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const emit = () => {
    const s = getMotionSetting();
    fn(computeEffective(s), s);
  };
  const onEvent = () => emit();
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) { apply(getMotionSetting()); emit(); } };
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const onMq = () => { apply(getMotionSetting()); emit(); };
  window.addEventListener(EVENT, onEvent);
  window.addEventListener("storage", onStorage);
  mq?.addEventListener?.("change", onMq);
  return () => {
    window.removeEventListener(EVENT, onEvent);
    window.removeEventListener("storage", onStorage);
    mq?.removeEventListener?.("change", onMq);
  };
}

// Re-apply from storage. Safe to call at any time.
export function hydrateMotion() {
  apply(getMotionSetting());
}