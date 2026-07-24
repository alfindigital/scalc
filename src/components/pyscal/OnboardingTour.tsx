import { useEffect, useState } from "react";

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

  if (!open) return null;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="onb-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
      onClick={finish}
    >
      <div className="onb-card" onClick={(e) => e.stopPropagation()}>
        <div className="onb-hint">{s.hint}</div>
        <div className="onb-title" id="onb-title">{s.title}</div>
        <div className="onb-body">{s.body}</div>
        <div className="onb-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`onb-dot ${i === step ? "active" : ""}`} />
          ))}
        </div>
        <div className="onb-actions">
          <button className="onb-skip" onClick={finish} type="button">
            Skip
          </button>
          <button
            className="onb-next"
            type="button"
            onClick={() => (isLast ? finish() : setStep((v) => v + 1))}
          >
            {isLast ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;