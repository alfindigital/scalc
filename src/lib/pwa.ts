// PWA registration with iframe + preview guard.
// Editor preview iframes (id-preview--*, lovableproject.com) NEVER register a SW
// — they actively unregister any leftover one to keep the preview clean.
// Production host registers /sw.js for offline-first.

const updateListeners = new Set<() => void>();
let waitingWorker: ServiceWorker | null = null;

export function onUpdateAvailable(cb: () => void): () => void {
  updateListeners.add(cb);
  if (waitingWorker) cb();
  return () => updateListeners.delete(cb);
}

function notifyUpdate(worker: ServiceWorker) {
  waitingWorker = worker;
  updateListeners.forEach((cb) => cb());
}

export function applyUpdate(): void {
  if (!waitingWorker) {
    // Fallback — no waiting worker tracked, just reload.
    window.location.reload();
    return;
  }
  const w = waitingWorker;
  // Reload once the new worker takes control.
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  w.postMessage({ type: "SKIP_WAITING" });
}

export function setupPWA(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const host = window.location.hostname;
  // E2E escape hatch: allow forcing SW on localhost/127.0.0.1 via ?e2e-sw=1 (persisted in sessionStorage for reloads).
  let forceSW = false;
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("e2e-sw") === "1") {
      sessionStorage.setItem("__pyscal_e2e_sw", "1");
    }
    forceSW = sessionStorage.getItem("__pyscal_e2e_sw") === "1";
  } catch {
    /* noop */
  }
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1");

  if ((inIframe || isPreviewHost) && !forceSW) {
    // Kill-switch: clean up any SW + caches that may have been installed previously.
    navigator.serviceWorker.getRegistrations().then((rs) => {
      rs.forEach((r) => r.unregister().catch(() => {}));
    });
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => {
        keys.filter((k) => k.startsWith("pyscal")).forEach((k) => caches.delete(k));
      });
    }
    return;
  }

  // Production: register SW. Run immediately if load already fired
  // (setupPWA is called from useEffect, which may run after `load`).
  const doRegister = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // If a waiting worker already exists at load, notify immediately.
        if (reg.waiting && navigator.serviceWorker.controller) {
          notifyUpdate(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdate(nw);
            }
          });
        });
        // Poll for updates every hour while the tab is open.
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch((err) => {
        console.warn("[pyscal] SW register failed:", err);
      });
  };
  if (document.readyState === "complete") doRegister();
  else window.addEventListener("load", doRegister, { once: true });
}

// Install prompt helper. Returns a handle the UI can use to trigger install.
export interface InstallPromptHandle {
  available: boolean;
  prompt: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

export function bindInstallPrompt(): () => void {
  if (typeof window === "undefined") return () => {};
  const onPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((cb) => cb());
  };
  const onInstalled = () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb());
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isInstallAvailable(): boolean {
  return !!deferredPrompt;
}

export async function triggerInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  try {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((cb) => cb());
    return choice?.outcome === "accepted" ? "accepted" : "dismissed";
  } catch {
    return "unavailable";
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ---- Platform detection ----
export type Platform = "ios" | "android" | "desktop" | "unknown";

export interface PlatformInfo {
  platform: Platform;
  isSafari: boolean;
  isChrome: boolean;
  /** In-app browsers (IG, FB, Line, TikTok, etc.) — install/A2HS biasanya tidak tersedia. */
  isInAppBrowser: boolean;
}

export function detectPlatform(): PlatformInfo {
  if (typeof navigator === "undefined") {
    return { platform: "unknown", isSafari: false, isChrome: false, isInAppBrowser: false };
  }
  const ua = navigator.userAgent || "";
  const isIPad =
    /iPad/.test(ua) ||
    // iPadOS 13+ reports as Mac; detect via touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isIOS = /iPhone|iPod/.test(ua) || isIPad;
  const isAndroid = /Android/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua);
  const isInAppBrowser =
    /(FBAN|FBAV|Instagram|Line|TikTok|MicroMessenger|Twitter|LinkedInApp)/i.test(ua);

  let platform: Platform = "unknown";
  if (isIOS) platform = "ios";
  else if (isAndroid) platform = "android";
  else if (/Mac|Win|Linux|CrOS/i.test(ua)) platform = "desktop";

  return { platform, isSafari, isChrome, isInAppBrowser };
}
