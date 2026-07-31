import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "pyscal_tg_popup_v1";
const DURATION = 10; // detik sebelum auto-hide
const TG_URL = "https://t.me/lotmetrik";

const CSS = `
.tgp-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;
  justify-content:center;padding:16px;background:rgba(0,0,0,.6);
  animation:onb-fade .2s ease-out both}
.tgp-card{position:relative;width:100%;max-width:360px;background:var(--surface);
  color:var(--text-d);border:1px solid var(--border);border-radius:16px;
  padding:22px 18px 16px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45);
  animation:onb-rise .25s ease both}
.tgp-close{position:absolute;top:6px;right:6px;width:44px;height:44px;display:flex;
  align-items:center;justify-content:center;background:transparent;border:none;
  color:var(--text-m);font-size:20px;line-height:1;border-radius:10px;cursor:pointer}
.tgp-close:hover{color:var(--text-d);background:var(--surface-hover)}
.tgp-close:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.tgp-badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.6px;
  text-transform:uppercase;color:var(--brand);border:1px solid var(--brand);
  border-radius:999px;padding:3px 9px;margin-bottom:10px}
.tgp-title{font-size:17px;font-weight:800;line-height:1.3;margin-bottom:6px}
.tgp-body{font-size:12.5px;line-height:1.5;color:var(--text-m);margin-bottom:14px}
.tgp-cta{display:block;width:100%;background:var(--brand);color:#fff;border:none;
  font-size:14px;font-weight:800;padding:13px 16px;min-height:48px;border-radius:12px;
  cursor:pointer;text-decoration:none;line-height:1.4}
.tgp-cta:hover{filter:brightness(1.06)}
.tgp-cta:focus-visible{outline:2px solid var(--brand);outline-offset:3px}
.tgp-later{background:transparent;border:none;color:var(--text-m);font-size:12px;
  padding:10px 12px;min-height:40px;cursor:pointer;border-radius:8px;margin-top:6px}
.tgp-later:hover{color:var(--text-d)}
.tgp-later:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.tgp-timer{display:flex;align-items:center;gap:8px;margin-top:12px}
.tgp-secs{font-size:10.5px;font-weight:700;color:var(--text-m);
  font-variant-numeric:tabular-nums;min-width:26px;text-align:right}
.tgp-track{flex:1;height:4px;background:var(--border);border-radius:999px;overflow:hidden}
.tgp-fill{display:block;height:100%;background:var(--brand);border-radius:999px;
  transition:width 1s linear}
@media (prefers-reduced-motion: reduce){
  .tgp-overlay,.tgp-card{animation:none}
  .tgp-fill{transition:none}
}
`;

export function TelegramPopup() {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    // Jangan tumpuk dengan onboarding tour: tunggu sampai overlay-nya tertutup.
    const iv = window.setInterval(() => {
      if (!document.querySelector(".onb-overlay")) {
        window.clearInterval(iv);
        setOpen(true);
      }
    }, 600);
    return () => window.clearInterval(iv);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* noop */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    ctaRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const iv = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          window.clearInterval(iv);
          close();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearInterval(iv);
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="tgp-overlay" onClick={close}>
        <div
          className="tgp-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tgp-title"
          aria-describedby="tgp-body"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="tgp-close"
            onClick={close}
            aria-label="Tutup popup Telegram"
          >
            &times;
          </button>
          <div className="tgp-badge">Gratis &middot; Telegram</div>
          <div className="tgp-title" id="tgp-title">
            Bid-mu masih nebak-nebak?
          </div>
          <div className="tgp-body" id="tgp-body">
            Gabung <strong>@lotmetrik</strong> &mdash; watchlist &amp; area bid harian buat trader
            IDX. Sekali klik, langsung ikut.
          </div>
          <a
            ref={ctaRef}
            className="tgp-cta"
            href={TG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            Join Channel Sekarang &rarr;
          </a>
          <button type="button" className="tgp-later" onClick={close}>
            Nanti aja
          </button>
          <div
            className="tgp-timer"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={DURATION}
            aria-valuenow={left}
            aria-valuetext={`Popup tertutup otomatis dalam ${left} detik`}
            aria-label="Sisa waktu popup"
          >
            <span className="tgp-track" aria-hidden="true">
              <span className="tgp-fill" style={{ width: `${(left / DURATION) * 100}%` }} />
            </span>
            <span className="tgp-secs" aria-hidden="true">
              {left}s
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default TelegramPopup;
