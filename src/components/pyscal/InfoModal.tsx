// @ts-nocheck
import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { shortcutToString } from "@/lib/storage";
import { XIcon } from "./icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function InfoModal({ onClose, shortcuts }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const el = restoreRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) || []).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        aria-describedby="info-modal-desc"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="info-modal-title">
            Tentang PYSCAL
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup dialog Tentang PYSCAL"
          >
            <XIcon />
          </button>
        </div>
        <div className="modal-body info-body">
          <section className="info-sec" aria-labelledby="info-h-apa">
            <h3 className="info-h" id="info-h-apa">
              Apa itu PYSCAL?
            </h3>
            <p className="info-p" id="info-modal-desc">
              Kalkulator <strong>pyramid bid</strong> (averaging-down berlapis) untuk trader saham{" "}
              <strong>IDX / BEI</strong>. Rencanakan bid berjenjang, hitung <em>average price</em>,
              alokasi modal, dan lot per layer sesuai <em>tick size</em> dan fee broker Indonesia.
              Semua data disimpan lokal di browser — tanpa signup, tanpa server, aman dipakai
              offline.
            </p>
          </section>
          <section className="info-sec" aria-labelledby="info-h-siapa">
            <h3 className="info-h" id="info-h-siapa">
              Untuk siapa?
            </h3>
            <p className="info-p">
              Trader IDX yang pakai strategi <em>staggered buy</em>, <em>pyramid averaging</em>,
              atau siap-siap DCA di area support. PYSCAL memastikan tiap layer sesuai{" "}
              <strong>fraksi harga (tick size) BEI</strong> dan menghitung <em>break-even</em>{" "}
              setelah fee jual-beli otomatis.
            </p>
          </section>
          <section className="info-sec" aria-labelledby="info-h-cara">
            <h3 className="info-h" id="info-h-cara">
              Cara pakai
            </h3>
            <ol className="info-ol">
              <li>
                Masukkan <strong>bid awal</strong>, target profit / tick, dan fee beli–jual broker
                Anda.
              </li>
              <li>
                Tambah <strong>papan bid</strong> berikutnya — harga turun berlapis untuk
                averaging-down.
                <span className="ob-kbd info-kbd">{shortcutToString(shortcuts.addPapan)}</span>
              </li>
              <li>
                PYSCAL menghitung <strong>average price</strong>, total lot, modal terpakai, dan
                target jual otomatis.
              </li>
              <li>
                Simpan hasil ke <strong>History</strong>, atau simpan skema ke{" "}
                <strong>Preset</strong> per ticker lewat Settings.
                <span className="ob-kbd info-kbd">{shortcutToString(shortcuts.saveTrade)}</span>
              </li>
            </ol>
          </section>
          <div className="info-faq">
            <Link
              className="info-faq-link"
              to="/faq"
              onClick={onClose}
              aria-label="Buka halaman FAQ PYSCAL"
            >
              Buka halaman FAQ <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
