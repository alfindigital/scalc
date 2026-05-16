// PWA registration with iframe + preview guard.
// Editor preview iframes (id-preview--*, lovableproject.com) NEVER register a SW
// — they actively unregister any leftover one to keep the preview clean.
// Production host registers /sw.js for offline-first.

export function setupPWA(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("localhost") ||
    host.includes("127.0.0.1");

  if (inIframe || isPreviewHost) {
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

  // Production: register SW.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("[pyscal] SW register failed:", err);
    });
  });
}

// Install prompt helper. Returns a handle the UI can use to trigger install.
export interface InstallPromptHandle {
  available: boolean;
  prompt: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

let deferredPrompt: any = null;
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
    (window.navigator as any).standalone === true
  );
}
