import { shortcutToString } from "@/lib/storage";
import { XIcon } from "./icons";

export function InfoModal({ onClose, shortcuts }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
      >
        <div className="modal-header">
          <div className="modal-title" id="info-modal-title">
            Tentang PYSCAL
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <XIcon />
          </button>
        </div>
        <div className="modal-body info-body">
          <section className="info-sec">
            <h3 className="info-h">Apa itu PYSCAL?</h3>
            <p className="info-p">
              Kalkulator <strong>pyramid bid</strong> (averaging-down berlapis) untuk trader saham{" "}
              <strong>IDX / BEI</strong>. Rencanakan bid berjenjang, hitung <em>average price</em>,
              alokasi modal, dan lot per layer sesuai <em>tick size</em> dan fee broker Indonesia.
              Semua data disimpan lokal di browser — tanpa signup, tanpa server, aman dipakai
              offline.
            </p>
          </section>
          <section className="info-sec">
            <h3 className="info-h">Untuk siapa?</h3>
            <p className="info-p">
              Trader IDX yang pakai strategi <em>staggered buy</em>, <em>pyramid averaging</em>,
              atau siap-siap DCA di area support. PYSCAL memastikan tiap layer sesuai{" "}
              <strong>fraksi harga (tick size) BEI</strong> dan menghitung <em>break-even</em>{" "}
              setelah fee jual-beli otomatis.
            </p>
          </section>
          <section className="info-sec">
            <h3 className="info-h">Cara pakai</h3>
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
        </div>
      </div>
    </div>
  );
}

export default InfoModal;
