import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { setupPWA, bindInstallPrompt } from "@/lib/pwa";

const Pyscal = lazy(() => import("@/components/Pyscal"));

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PYSCAL — Pyramid Bid Calculator untuk Trader IDX" },
      { name: "description", content: "Kalkulator pyramid averaging-down untuk trader saham IDX. Hitung bid berlapis, simpan history, dan jalankan offline tanpa daftar." },
      { property: "og:url", content: "https://scalc.alfindigital.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://scalc.alfindigital.com/" },
    ],
  }),
});

function Index() {
  // Client-only mount: Pyscal touches localStorage/navigator extensively
  // and the original component was never SSR-tested. Render after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setupPWA();
    const unbind = bindInstallPrompt();
    return unbind;
  }, []);
  return (
    <>
      <main id="main">
        {mounted ? (
          <Pyscal />
        ) : (
          <div style={{ minHeight: "60vh", padding: "24px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>PYSCAL</h1>
            <p style={{ marginTop: 8, opacity: 0.8 }}>
              Pyramid Bid Calculator untuk trader saham IDX.
            </p>
            <SeoContent />
          </div>
        )}
      </main>
    </>
  );
}

// SSR-rendered content so Google & AI crawlers (Perplexity, ChatGPT)
// can index real prose about the app, not just the JS shell.
function SeoContent() {
  return (
    <section className="pyscal-seo" aria-label="Tentang PYSCAL">
      <div className="pyscal-seo__inner">
        <h2>Apa itu PYSCAL?</h2>
        <p>
          PYSCAL adalah kalkulator <strong>pyramid bid</strong> (averaging-down berlapis)
          untuk trader saham <strong>IDX / BEI</strong>. Rencanakan bid berjenjang, hitung
          <em> average price</em>, alokasi modal, dan lot per layer sesuai
          <em> tick size</em> dan fee broker Indonesia. Semua data disimpan lokal
          di browser—tanpa signup, tanpa server, aman dipakai offline.
        </p>
        <h2>Untuk siapa?</h2>
        <p>
          Cocok untuk trader IDX yang pakai strategi <em>staggered buy</em>,
          <em> pyramid averaging</em>, atau siap-siap DCA di area support. PYSCAL memastikan
          tiap layer sesuai <strong>fraksi harga (tick size) BEI</strong> dan menghitung
          <em> break-even</em> setelah fee jual-beli otomatis.
        </p>
        <h2>Pelajari lebih lanjut</h2>
        <ul>
          <li>
            <a href="/panduan-averaging-down">Panduan averaging-down saham</a> —
            kapan pakai, kapan hindari.
          </li>
          <li>
            <a href="/rumus-fee-broker-idx">Rumus fee broker IDX</a> —
            cara hitung biaya beli & jual saham.
          </li>
          <li>
            <a href="/tick-size-idx">Tick size / fraksi harga BEI</a> —
            tabel lengkap per rentang harga.
          </li>
        </ul>
      </div>
    </section>
  );
}
