import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://pyscal.lovable.app/panduan-averaging-down";
const TITLE = "Panduan Averaging Down Saham IDX — Kapan Pakai, Kapan Hindari";
const DESC =
  "Averaging down saham di BEI: prinsip, cara hitung average price, risiko psikologis, dan skenario kapan pyramid bid layak dipakai untuk trader IDX.";

export const Route = createFileRoute("/panduan-averaging-down")({
  component: PanduanPage,
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

function PanduanPage() {
  return (
    <article className="pyscal-article">
      <div className="pyscal-article__inner">
        <nav className="pyscal-article__nav" aria-label="Navigasi">
          <Link to="/">← Kembali ke kalkulator</Link>
          <Link to="/rumus-fee-broker-idx">Rumus fee broker</Link>
          <Link to="/tick-size-idx">Tick size BEI</Link>
        </nav>
        <h1>Panduan Averaging Down Saham IDX</h1>
        <p>
          <em>Averaging down</em> adalah menambah posisi beli saat harga saham turun
          di bawah harga beli awal. Tujuannya menurunkan <strong>average price</strong>{" "}
          sehingga saham hanya perlu naik tipis untuk kembali <em>break-even</em>. Di
          IDX, teknik ini sering dikombinasikan dengan <strong>pyramid bid</strong>:
          bid berlapis dengan lot yang menyesuaikan tiap layer.
        </p>

        <h2>Rumus dasar average price</h2>
        <p>
          <code>
            Avg = (Σ harga<sub>i</sub> × lot<sub>i</sub>) ÷ Σ lot<sub>i</sub>
          </code>
        </p>
        <p>
          Contoh: beli 1 lot BBRI di 4.500, tambah 2 lot di 4.300 → avg = (4.500 + 2×4.300) ÷ 3 = <strong>4.367</strong>.
        </p>

        <h2>Kapan averaging down MASUK AKAL</h2>
        <ul>
          <li>Emiten fundamentalnya sehat, penurunan harga bersifat siklikal / sentimen pasar.</li>
          <li>Anda punya <strong>rencana lot & harga sebelum</strong> harga turun (bukan reaktif).</li>
          <li>Alokasi modal masih di bawah batas risiko per emiten (mis. 5–10% dari portofolio).</li>
          <li>Ada <em>support</em> teknikal jelas di area bid berikutnya.</li>
        </ul>

        <h2>Kapan averaging down BERBAHAYA</h2>
        <ul>
          <li>Emiten <em>fundamentally impaired</em> (laba anjlok permanen, gugatan besar, delisting risk).</li>
          <li>Modal sudah <em>overweight</em> di satu ticker—averaging = memperbesar konsentrasi risiko.</li>
          <li>Tidak ada <em>cut-loss plan</em>. Averaging tanpa exit plan = <em>catching falling knife</em>.</li>
          <li>Menutupi bias emosional (<em>loss aversion</em>) alih-alih keputusan rasional.</li>
        </ul>

        <h2>Cara PYSCAL membantu</h2>
        <p>
          Alih-alih menghitung manual tiap layer, buka <Link to="/">kalkulator PYSCAL</Link>{" "}
          lalu tambahkan papan bid. Kalkulator otomatis:
        </p>
        <ul>
          <li>Menghitung <strong>average price</strong> setelah tiap layer terisi.</li>
          <li>Menerapkan <strong>tick size BEI</strong> — bid tidak keluar dari fraksi harga.</li>
          <li>Menghitung <strong>break-even</strong> setelah fee beli + jual broker Anda.</li>
          <li>Menghitung target jual untuk profit yang Anda pilih (per tick atau %).</li>
        </ul>

        <h2>Contoh skema pyramid 3 layer</h2>
        <table>
          <thead>
            <tr><th>Layer</th><th>Harga bid</th><th>Lot</th><th>Modal (Rp)</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>4.500</td><td>1</td><td>450.000</td></tr>
            <tr><td>2</td><td>4.300</td><td>2</td><td>860.000</td></tr>
            <tr><td>3</td><td>4.100</td><td>3</td><td>1.230.000</td></tr>
            <tr><td><strong>Avg</strong></td><td colSpan={3}><strong>4.240</strong> · total 6 lot · modal Rp 2.540.000</td></tr>
          </tbody>
        </table>

        <p style={{ marginTop: 24 }}>
          Siap coba? <Link to="/">Buka kalkulator PYSCAL →</Link>
        </p>
      </div>
    </article>
  );
}