import { useEffect, useId, useRef, useState } from "react";

const STORAGE_KEY = "pyscal_onboarded_v1";

type Step = {
  title: string;
  body: string;
  hint: string;
};

const STEPS: Step[] = [
  {
    title: "1. Isi input dulu",
    body: "Masukkan bid awal, target profit / tick, dan fee broker di kartu input. Semua kalkulasi otomatis tanpa tombol Hitung.",
    hint: "↑ kartu input di atas",
  },
  {
    title: "2. Pilih preset",
    body: "Punya skema fee favorit? Simpan sebagai preset lewat tombol ikon slider di toolbar papan, lalu muat kapan pun.",
    hint: "↑ toolbar papan (ikon slider)",
  },
  {
    title: "3. Lihat hasil",
    body: "Tabel papan akan tampil di bawah: harga bid, lot, average, dan target jual per layer — update real-time.",
    hint: "↓ tabel papan",
  },
  {
    title: "4. Auto-tersimpan",
    body: "State kalkulator tersimpan otomatis di device kamu. Tekan ikon bookmark untuk snapshot ke History.",
    hint: "↑ ikon History & Bookmark",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartT = useRef<number>(0);
  const [swipeDx, setSwipeDx] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  // Allow manual restart from Settings via a global event.
  useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("pyscal:restart-onboarding", handler);
    return () => window.removeEventListener("pyscal:restart-onboarding", handler);
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, dontShowAgain ? "dismissed" : "1");
    } catch {}
    setOpen(false);
  };

  // Focus management: trap Tab, ESC to close, restore focus on unmount.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = (document.activeElement as HTMLElement) ?? null;
    // Lock body scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the primary action on open / step change.
    const focusTimer = window.setTimeout(() => nextBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStep((v) => Math.min(v + 1, STEPS.length - 1));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((v) => Math.max(v - 1, 0));
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Refocus primary action when step changes so screen readers land on it.
  useEffect(() => {
    if (!open) return;
    nextBtnRef.current?.focus();
  }, [step, open]);

  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const stepLabel = `Langkah ${step + 1} dari ${STEPS.length}`;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchStartT.current = Date.now();
    setSwipeDx(0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy)) setSwipeDx(dx);
  };
  const onTouchEnd = () => {
    const dx = swipeDx;
    const dt = Date.now() - touchStartT.current;
    touchStartX.current = null;
    touchStartY.current = null;
    setSwipeDx(0);
    const threshold = 50;
    if (Math.abs(dx) < threshold && dt > 500) return;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) setStep((v) => Math.min(v + 1, STEPS.length - 1));
    else setStep((v) => Math.max(v - 1, 0));
  };

  return (
    <div className="onb-overlay" onClick={finish}>
      <div
        ref={dialogRef}
        className="onb-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onb-title"
        aria-describedby="onb-body"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={
          swipeDx !== 0 ? { transform: `translateX(${swipeDx}px)`, transition: "none" } : undefined
        }
      >
        <button type="button" className="onb-close" onClick={finish} aria-label="Lewati onboarding">
          Lewati
        </button>
        <div className="onb-hint" aria-hidden="true">
          {s.hint}
        </div>
        <div className="pyscal-sr-only" aria-live="polite" aria-atomic="true">
          {stepLabel}: {s.title}
        </div>
        <div
          className="onb-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Langkah ${step + 1} dari ${STEPS.length}`}
          aria-label="Progres onboarding"
        >
          <span className="onb-count" aria-hidden="true">
            {step + 1} / {STEPS.length}
          </span>
          <span className="onb-bar" aria-hidden="true">
            <span
              className="onb-bar-fill"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </span>
        </div>
        <div className="onb-title" id="onb-title">
          {s.title}
        </div>
        <div className="onb-body" id="onb-body">
          {s.body}
        </div>
        <label className="onb-dont-show" htmlFor={checkboxId}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            aria-label="Jangan tampilkan onboarding lagi"
          />
          <span>Jangan tampilkan lagi</span>
        </label>
        <div className="onb-dots" role="tablist" aria-label="Progres onboarding">
          {STEPS.map((st, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-current={i === step ? "step" : undefined}
              aria-label={`Langkah ${i + 1} dari ${STEPS.length}: ${st.title}`}
              tabIndex={i === step ? 0 : -1}
              className={`onb-dot ${i === step ? "active" : ""}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        <div className="onb-actions">
          <button
            className="onb-skip"
            onClick={finish}
            type="button"
            aria-label="Lewati onboarding"
          >
            Lewati
          </button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="onb-skip"
              type="button"
              onClick={() => setStep((v) => Math.max(v - 1, 0))}
              disabled={isFirst}
              aria-label="Langkah sebelumnya"
            >
              Kembali
            </button>
            <button
              ref={nextBtnRef}
              className="onb-next"
              type="button"
              onClick={() => (isLast ? finish() : setStep((v) => v + 1))}
              aria-label={
                isLast
                  ? "Selesai, tutup onboarding"
                  : `Lanjut ke ${stepLabel.replace(String(step + 1), String(step + 2))}`
              }
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
