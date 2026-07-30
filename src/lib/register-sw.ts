/**
 * Service worker registration, guarded so it never runs in dev or Lovable preview.
 * Offline caching only applies to the published site.
 *
 * The worker does NOT skip waiting on its own: when a new build is cached we
 * notify the app so the user can refresh at their convenience.
 */
const SW_URL = "/sw.js";

let waitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

/** Subscribe to "a new version is ready" — returns an unsubscribe function. */
export function onUpdateAvailable(cb: () => void): () => void {
  listeners.add(cb);
  if (waitingWorker) cb();
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach((cb) => cb());
}

/** Activates the waiting worker and reloads once it takes control. */
export function applyUpdate() {
  if (!waitingWorker) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener(
    "controllerchange",
    () => window.location.reload(),
    { once: true },
  );
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

function blocked(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  if (window.top !== window.self) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com"))
    return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    return new URLSearchParams(window.location.search).get("sw") === "off";
  }
  return false;
}

async function unregisterExisting() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => (r.active?.scriptURL ?? "").endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

function track(reg: ServiceWorkerRegistration) {
  if (reg.waiting && navigator.serviceWorker.controller) {
    waitingWorker = reg.waiting;
    notify();
  }
  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      // "installed" with an existing controller == an update, not a first install.
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        waitingWorker = installing;
        notify();
      }
    });
  });
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (blocked()) {
    void unregisterExisting();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((reg) => {
        track(reg);
        // Look for a newer build when the tab regains focus.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void reg.update();
        });
      })
      .catch(() => {
        /* offline support is best-effort */
      });
  });
}
