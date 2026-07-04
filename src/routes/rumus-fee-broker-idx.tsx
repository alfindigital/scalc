import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://pyscal.lovable.app/rumus-fee-broker-idx";
const TITLE = "Rumus Fee Broker Saham IDX — Cara Hitung Biaya Beli & Jual";
const DESC =
  "Cara hitung fee beli dan jual saham di IDX. Komponen fee broker (levy, PPN, PPh), rumus break-even setelah fee, serta contoh perhitungan untuk Ajaib, Mirae, Stockbit, dan IPOT.";

export const Route = createFileRoute("/rumus-fee-broker-idx")({
  component: FeePage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          inLanguage: "id-ID",
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "PYSCAL" },
        }),
      },
    ],
  }),
});

function FeePage() {
  return (
    <article className="pyscal-article">
      <div className="pyscal-article__inner">
        <nav className="pyscal-article__nav" aria-label="Navigasi">
          <Link to="/" data-nav="back">← Kalkulator</Link>
          <Link to="/panduan-averaging-down">Panduan averaging-down</Link>
          <Link to="/tick-size-idx">Tick size BEI</Link>
          <span className="pyscal-article__nav-label">PYSCAL / EDU</span>
        </nav>
        <header className="pyscal-article__header">
          <div className="pyscal-article__tags">
            <span className="pyscal-article__tag">Fees</span>
            <span className="pyscal-article__tag" data-variant="muted">Dasar</span>
          </div>
          <h1>Rumus Fee Broker Saham IDX</h1>
          <p className="pyscal-article__lede">
            Komponen fee beli &amp; jual di BEI (levy, PPN, PPh) plus rumus
            <strong> break-even</strong> setelah fee — dengan contoh Ajaib, Mirae, Stockbit, IPOT.
          </p>
        </header>
        <p>
          Tiap transaksi saham di Bursa Efek Indonesia (BEI) dikenakan{" "}
          <strong>fee broker</strong>. Fee beli dan fee jual berbeda—fee jual
          selalu lebih besar karena ada <strong>PPh final 0,1%</strong> penjualan saham.
        </p>

        <h2>Rumus umum</h2>
        <p>
          <code>Fee Beli = Nilai Transaksi × %fee_beli</code>
          <br />
          <code>Fee Jual = Nilai Transaksi × %fee_jual</code>
          <br />
          <code>%fee_jual = %fee_beli + 0,1%</code> (PPh final penjual saham).
        </p>

        <h2>Komponen fee</h2>
        <ul>
          <li><strong>Komisi broker</strong> — bervariasi per sekuritas.</li>
          <li><strong>Levy BEI, KPEI, KSEI</strong> — sekitar 0,043%.</li>
          <li><strong>PPN 11%</strong> — dikenakan atas komisi + levy.</li>
          <li><strong>PPh Final 0,1%</strong> — hanya di sisi jual.</li>
        </ul>

        <h2>Estimasi fee broker populer (verifikasi ke broker Anda)</h2>
        <table>
          <thead>
            <tr><th>Broker</th><th>Fee Beli</th><th>Fee Jual</th></tr>
          </thead>
          <tbody>
            <tr><td>Ajaib</td><td>0,15%</td><td>0,25%</td></tr>
            <tr><td>Stockbit / Sinarmas</td><td>0,15%</td><td>0,25%</td></tr>
            <tr><td>Mirae (HOTS)</td><td>0,15–0,18%</td><td>0,25–0,28%</td></tr>
            <tr><td>IPOT (Indo Premier)</td><td>0,19%</td><td>0,29%</td></tr>
            <tr><td>BNI Sekuritas</td><td>0,17%</td><td>0,27%</td></tr>
          </tbody>
        </table>
        <p style={{ fontSize: 13, opacity: 0.75 }}>
          Catatan: banyak broker memiliki fee tier berdasarkan volume—cek dashboard sekuritas Anda.
        </p>

        <h2>Contoh perhitungan</h2>
        <p>
          Beli 10 lot BBRI @ 4.500 (Rp 4.500.000):<br />
          Fee beli 0,15% = <strong>Rp 6.750</strong>. Modal keluar = Rp 4.506.750.
        </p>
        <p>
          Jual 10 lot BBRI @ 4.600 (Rp 4.600.000):<br />
          Fee jual 0,25% = <strong>Rp 11.500</strong>. Kas masuk = Rp 4.588.500.
        </p>
        <p>
          <strong>Net profit</strong> = 4.588.500 − 4.506.750 = <strong>Rp 81.750</strong>.
        </p>

        <h2>Break-even setelah fee</h2>
        <p>
          <code>
            Harga BEP = Avg × (1 + %fee_beli) ÷ (1 − %fee_jual)
          </code>
        </p>
        <p>
          <Link to="/">Kalkulator PYSCAL</Link> menghitung ini otomatis—Anda tinggal
          input %fee beli & jual sekali di Settings.
        </p>

        <aside className="pyscal-article__more" aria-label="Baca juga">
          <h2 className="pyscal-article__more-h">Pelajari lebih lanjut</h2>
          <div className="pyscal-article__cards">
            <Link to="/panduan-averaging-down" className="pyscal-article__card">
              <div className="pyscal-article__card-inner">
                <span className="pyscal-article__card-t">Panduan averaging-down saham</span>
                <span className="pyscal-article__card-d">Kapan pakai, kapan hindari pyramid bid.</span>
              </div>
            </Link>
            <Link to="/tick-size-idx" className="pyscal-article__card">
              <div className="pyscal-article__card-inner">
                <span className="pyscal-article__card-t">Tick size / fraksi harga BEI</span>
                <span className="pyscal-article__card-d">Tabel lengkap fraksi harga per rentang.</span>
              </div>
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}