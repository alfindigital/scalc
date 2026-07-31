// @ts-nocheck
// Internal helpers shared between Pyscal.tsx and its extracted panels.
// Behavior is identical to the original inline definitions.
import { useEffect, useId, useRef, useState } from "react";
import { getTickSize } from "@/lib/compute";
import { validateLot } from "@/lib/validation";
import {
  isInstallAvailable,
  isStandalone,
  subscribeInstallPrompt,
  triggerInstall,
  detectPlatform,
} from "@/lib/pwa";
import { CheckIcon } from "./icons";

export const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span>Mode offline — kalkulator tetap jalan, data tersimpan lokal.</span>
    </div>
  );
}

export function InstallAppRow() {
  const [available, setAvailable] = useState(isInstallAvailable());
  const [standalone] = useState(isStandalone());
  const [info] = useState(() => detectPlatform());
  useEffect(() => subscribeInstallPrompt(() => setAvailable(isInstallAvailable())), []);

  if (standalone) {
    return <div className="sp-empty">App sudah ter-install ✓</div>;
  }
  if (info.isInAppBrowser) {
    return (
      <div className="sp-empty">
        Kamu sedang di in-app browser. Tap menu ⋯ → "Open in{" "}
        {info.platform === "ios" ? "Safari" : "Chrome"}", lalu install dari sana.
      </div>
    );
  }
  if (info.platform === "ios") {
    return (
      <div className="sp-ios-install">
        <div className="sp-ios-title">Install di iOS (Safari)</div>
        <ol className="sp-ios-steps">
          <li>
            Pastikan kamu buka di <b>Safari</b> (bukan Chrome/in-app).
          </li>
          <li>
            Tap ikon <b>Share</b> <span className="sp-ios-ico">⬆︎</span> di bawah.
          </li>
          <li>
            Scroll, pilih <b>Add to Home Screen</b> <span className="sp-ios-ico">＋</span>.
          </li>
          <li>
            Tap <b>Add</b>. Icon PYSCAL muncul di home screen.
          </li>
        </ol>
        {!info.isSafari && (
          <div className="sp-ios-warn">
            ⚠ Browser saat ini bukan Safari. Add to Home Screen hanya bekerja penuh di Safari iOS.
          </div>
        )}
      </div>
    );
  }
  if (info.platform === "android" && !available) {
    return (
      <div className="sp-ios-install">
        <div className="sp-ios-title">Install di Android</div>
        <ol className="sp-ios-steps">
          <li>
            Pastikan buka di <b>Chrome</b> (bukan in-app browser).
          </li>
          <li>
            Tap menu <b>⋮</b> di pojok kanan atas.
          </li>
          <li>
            Pilih <b>Install app</b> atau <b>Add to Home screen</b>.
          </li>
        </ol>
        <div className="sp-ios-warn">
          Tip: prompt otomatis kadang muncul setelah beberapa detik di halaman — coba
          scroll/interaksi sebentar.
        </div>
      </div>
    );
  }
  if (info.platform === "desktop" && !available) {
    return (
      <div className="sp-empty">
        Buka di Chrome/Edge/Brave, lalu klik ikon <b>Install</b> di pojok kanan address bar (atau
        menu ⋮ → Install PYSCAL).
      </div>
    );
  }
  return (
    <div className="sp-import-export">
      <button className="sp-ie-btn" onClick={() => triggerInstall()}>
        ↓ Install PYSCAL {info.platform === "android" ? "(Android)" : "(Desktop)"}
      </button>
    </div>
  );
}

export function FieldHint({ status, id }) {
  if (!status || (!status.error && !status.warning)) return null;
  const isErr = !!status.error;
  return (
    <div
      id={id}
      className={`field-hint ${isErr ? "error" : "warning"}`}
      role={isErr ? "alert" : "status"}
      aria-live={isErr ? "assertive" : "polite"}
    >
      {isErr ? "✕ " : "⚠ "}
      {status.error || status.warning}
    </div>
  );
}

export function focusFirstInvalidInput(): boolean {
  if (typeof document === "undefined") return false;
  const invalids = Array.from(
    document.querySelectorAll<HTMLElement>('[aria-invalid="true"]'),
  ).filter((el) => {
    if ((el as HTMLInputElement).disabled) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    return true;
  });
  let target: HTMLElement | undefined = invalids[0];
  if (!target) {
    const hints = Array.from(document.querySelectorAll<HTMLElement>(".field-hint.error")).filter(
      (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      },
    );
    for (const hint of hints) {
      const id = hint.id;
      if (!id) continue;
      const owner = document.querySelector<HTMLElement>(`[aria-describedby~="${CSS.escape(id)}"]`);
      if (owner) {
        target = owner;
        break;
      }
    }
  }
  if (!target) return false;
  try {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch {
    target.scrollIntoView();
  }
  requestAnimationFrame(() => {
    try {
      target!.focus({ preventScroll: true });
    } catch {
      target!.focus();
    }
    if ((target as HTMLInputElement).select) {
      try {
        (target as HTMLInputElement).select();
      } catch {
        /* noop */
      }
    }
  });
  return true;
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" role="region" aria-label="Notifikasi" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type ? "toast-" + t.type : ""} ${t.leaving ? "toast-out" : ""}`}
          role={t.type === "error" ? "alert" : "status"}
          onAnimationEnd={() => {
            if (t.leaving) onRemove(t.id);
          }}
        >
          <span className="toast-icon">
            {t.type === "success" && <CheckIcon />}
            {t.type === "error" && "⚠"}
            {!t.type && "•"}
          </span>
          <span className="toast-text">{renderToastText(t.text)}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={() => {
                t.action.handler();
                onRemove(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function renderToastText(text) {
  if (text == null) return null;
  const str = String(text);
  const decode = (s) =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  const parts = [];
  const re = /<strong>([\s\S]*?)<\/strong>/g;
  let last = 0,
    m,
    i = 0;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(decode(str.slice(last, m.index)));
    parts.push(<strong key={i++}>{decode(m[1])}</strong>);
    last = re.lastIndex;
  }
  if (last < str.length) parts.push(decode(str.slice(last)));
  return parts;
}

export function focusGridCell(row, col) {
  if (row == null || col == null) return false;
  const el = document.querySelector(`[data-grid-row="${row}"][data-grid-col="${col}"]`);
  if (el && typeof (el as any).focus === "function") {
    (el as any).focus();
    if (typeof (el as any).select === "function") {
      try {
        (el as any).select();
      } catch {
        /* noop */
      }
    }
    return true;
  }
  return false;
}

export function handleGridNavKey(e, row, col) {
  const r = Number(row);
  if (Number.isNaN(r) || !col) return false;
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) {
      if (!focusGridCell(r - 1, col)) focusGridCell(0, col);
    } else if (!focusGridCell(r + 1, col)) {
      focusGridCell(r, col === "bid" ? "lot" : "bid");
    }
    return true;
  }
  if (e.altKey && e.key === "ArrowDown") {
    e.preventDefault();
    focusGridCell(r + 1, col);
    return true;
  }
  if (e.altKey && e.key === "ArrowUp") {
    e.preventDefault();
    focusGridCell(r - 1, col);
    return true;
  }
  if (e.altKey && e.key === "ArrowRight") {
    e.preventDefault();
    focusGridCell(r, col === "bid" ? "lot" : "bid");
    return true;
  }
  if (e.altKey && e.key === "ArrowLeft") {
    e.preventDefault();
    focusGridCell(r, col === "lot" ? "bid" : "lot");
    return true;
  }
  return false;
}

export function handleSetupEnter(e) {
  if (e.key !== "Enter") return;
  const nodes = Array.from(document.querySelectorAll('[data-kbdnav="setup"]'));
  const i = nodes.indexOf(e.currentTarget);
  if (i < 0) return;
  const next = e.shiftKey ? nodes[i - 1] : nodes[i + 1];
  if (next) {
    e.preventDefault();
    (next as any).focus();
    if (typeof (next as any).select === "function") {
      try {
        (next as any).select();
      } catch {
        /* noop */
      }
    }
  }
}

export function BidStepInput({
  value,
  onChange,
  onFocus,
  disabled,
  className = "",
  variant = "desktop",
  label,
  warning,
  error,
  gridRow,
  gridCol,
  ...rest
}) {
  const inputRef = useRef(null);
  const reactId = useId();
  const inputId = rest.id || `bid-input-${reactId}`;
  const hintId = `${inputId}-hint`;
  const [focused, setFocused] = useState(false);

  const haptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        /* noop */
      }
    }
  };

  const stepUp = (fromTouch = false) => {
    const tick = getTickSize(value || 1);
    const next = Math.max(1, (value || 0) + tick);
    onChange(next);
    if (fromTouch) haptic();
  };
  const stepDown = (fromTouch = false) => {
    if ((value || 0) <= 1) return;
    const tick = getTickSize(value || 1);
    const next = Math.max(1, (value || 0) - tick);
    onChange(next);
    if (fromTouch) haptic();
  };

  const handleKeyDown = (e) => {
    if (handleGridNavKey(e, gridRow, gridCol)) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      stepUp(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      stepDown(false);
    }
  };

  const restNoId = { ...rest };
  delete restNoId.id;

  return (
    <div
      className={`bid-step-wrap ${variant === "mobile" ? "bid-step-mobile" : ""} ${focused ? "focused" : ""}`}
    >
      {label ? (
        <label htmlFor={inputId} className="pyscal-sr-only">
          {label}
        </label>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        inputMode="decimal"
        enterKeyHint="done"
        className={className}
        value={value}
        min={1}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || warning ? hintId : undefined}
        data-grid-row={gridRow}
        data-grid-col={gridCol}
        onChange={(e) => onChange(+e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
          if (onFocus) onFocus(e);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        {...restNoId}
      />
      {error || warning ? (
        <span
          id={hintId}
          role="alert"
          aria-live={error ? "assertive" : "polite"}
          className="pyscal-sr-only"
        >
          {error || warning}
        </span>
      ) : null}
    </div>
  );
}

export function LotInput({
  value,
  onChange,
  className = "",
  label,
  gridRow,
  gridCol,
  onKeyDown,
  ...rest
}) {
  const reactId = useId();
  const inputId = rest.id || `lot-input-${reactId}`;
  const hintId = `${inputId}-hint`;
  const status = validateLot(Number(value));
  const message = status.error || status.warning || "";
  const restNoId = { ...rest };
  delete restNoId.id;
  return (
    <>
      <input
        id={inputId}
        type="number"
        className={className}
        value={value}
        min={1}
        step={100}
        inputMode="numeric"
        enterKeyHint="done"
        aria-label={label}
        aria-invalid={status.error ? true : undefined}
        aria-describedby={message ? hintId : undefined}
        data-grid-row={gridRow}
        data-grid-col={gridCol}
        onChange={(e) => onChange(+e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={onKeyDown}
        {...restNoId}
      />
      {message ? (
        <span
          id={hintId}
          role="alert"
          aria-live={status.error ? "assertive" : "polite"}
          className="pyscal-sr-only"
        >
          {message}
        </span>
      ) : null}
    </>
  );
}

export function SwipeableCard({ children, canSwipe, onDelete, className = "", style = {} }) {
  const [translate, setTranslate] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const axisRef = useRef(null);
  const cardRef = useRef(null);

  const reset = () => {
    setTranslate(0);
    setSwiping(false);
    axisRef.current = null;
  };

  const handleTouchStart = (e) => {
    if (!canSwipe) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    lastXRef.current = t.clientX;
    axisRef.current = null;
    setSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!canSwipe || !swiping) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    if (axisRef.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (axisRef.current === "y") return;
    e.preventDefault();
    lastXRef.current = t.clientX;
    setTranslate(Math.min(0, dx));
  };

  const handleTouchEnd = () => {
    if (!canSwipe || !swiping) {
      reset();
      return;
    }
    if (axisRef.current !== "x") {
      reset();
      return;
    }
    const cardWidth = cardRef.current ? cardRef.current.offsetWidth : 300;
    const threshold = cardWidth * 0.5;
    if (Math.abs(translate) > threshold) {
      setTranslate(-cardWidth);
      setTimeout(() => {
        onDelete();
        reset();
      }, 180);
    } else {
      reset();
    }
  };

  return (
    <div className="swipe-wrap" ref={cardRef}>
      {canSwipe && translate < -10 && (
        <div className="swipe-bg">
          <span>Hapus</span>
        </div>
      )}
      <div
        className={className}
        style={{
          ...style,
          transform: `translateX(${translate}px)`,
          transition: swiping ? "none" : "transform 0.18s ease-out",
          touchAction: canSwipe ? "pan-y" : "auto",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => reset()}
      >
        {children}
      </div>
    </div>
  );
}
