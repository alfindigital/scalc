import { createFileRoute, Link } from "@tanstack/react-router";
import { TutorialBookmark } from "@/components/TutorialBookmark";
import { TagChips } from "@/components/TagChips";

const URL = "https://pyscal.lovable.app/tick-size-idx";
const TITLE = "Tick Size / Fraksi Harga Saham BEI — Tabel Lengkap 2025";
const DESC =
  "Tabel lengkap tick size (fraksi harga) saham di Bursa Efek Indonesia per rentang harga. Aturan minimum kenaikan harga, contoh, dan cara PYSCAL menegakkan tick size di pyramid bid.";

export const Route = createFileRoute("/tick-size-idx")({
  component: TickPage,
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

function TickPage() {
  return (
    <article className="pyscal-article">
      <div className="pyscal-article__inner">
        <nav className="pyscal-article__nav" aria-label="Navigasi">
          <Link to="/" data-nav="back">← Kalkulator</Link>
          <span className="pyscal-article__nav-label">PYSCAL / EDU</span>
          <TutorialBookmark path="/tick-size-idx" title="Tick Size / Fraksi Harga Saham BEI" />
        </nav>
        <header className="pyscal-article__header">
          <TagChips items={[{ label: "Market Rules" }, { label: "Referensi", variant: "muted" }]} />
          <h1>Tick Size / Fraksi Harga Saham BEI</h1>
          <p className="pyscal-article__lede">
            Tabel fraksi harga resmi Bursa Efek Indonesia — minimum kenaikan / penurunan
            harga per rentang. Bid di luar fraksi ditolak sistem JATS.
          </p>
        </header>
        <p>
          <strong>Tick size</strong> (fraksi harga) adalah minimum kenaikan / penurunan
          harga saham yang diperbolehkan di Bursa Efek Indonesia. Bid dan offer di luar
          fraksi ini akan ditolak sistem JATS.
        </p>

        <h2>Tabel tick size BEI</h2>
        <table>
          <thead>
            <tr>
              <th>Rentang harga (Rp)</th>
              <th>Fraksi (Rp)</th>
              <th>Maks. perubahan / order</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>&lt; 200</td><td>1</td><td>10</td></tr>
            <tr><td>200 – &lt; 500</td><td>2</td><td>20</td></tr>
            <tr><td>500 – &lt; 2.000</td><td>5</td><td>50</td></tr>
            <tr><td>2.000 – &lt; 5.000</td><td>10</td><td>100</td></tr>
            <tr><td>≥ 5.000</td><td>25</td><td>250</td></tr>
          </tbody>
        </table>

        <h2>Contoh</h2>
        <ul>
          <li>Saham di harga 3.200 → naik/turun kelipatan <strong>10</strong> (3.190, 3.200, 3.210…).</li>
          <li>Saham di harga 480 → kelipatan <strong>2</strong> (478, 480, 482…).</li>
          <li>Saham di harga 7.500 → kelipatan <strong>25</strong> (7.475, 7.500, 7.525…).</li>
        </ul>

        <h2>Kenapa penting untuk pyramid bid</h2>
        <p>
          Saat averaging down, tiap layer harus jatuh di harga <em>valid</em>. Salah tick
          size = order tidak masuk, atau <em>slippage</em> tak terduga.
          <Link to="/"> Kalkulator PYSCAL</Link> otomatis menegakkan tick size—tombol
          naik/turun bid selalu bergerak sesuai fraksi harga rentang tersebut.
        </p>

        <p style={{ fontSize: 13, opacity: 0.75 }}>
          Referensi: aturan tick size berlaku sejak SE BEI. Bursa dapat merevisi—selalu
          cek pengumuman resmi IDX untuk perubahan terbaru.
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
            <Link to="/rumus-fee-broker-idx" className="pyscal-article__card">
              <div className="pyscal-article__card-inner">
                <span className="pyscal-article__card-t">Rumus fee broker IDX</span>
                <span className="pyscal-article__card-d">Cara hitung biaya beli &amp; jual saham per sekuritas.</span>
              </div>
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}