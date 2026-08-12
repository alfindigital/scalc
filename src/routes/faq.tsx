import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://s-calc.lovable.app/faq";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Apa itu pyramid bid (averaging down berlapis)?",
    a: "Pyramid bid adalah strategi memasang beberapa order beli bertingkat di bawah harga sekarang, bukan sekali borong. Tiap layer punya harga dan lot sendiri, sehingga harga rata-rata turun terkendali kalau harga saham melemah, dan modal tidak habis di satu harga.",
  },
  {
    q: "Bagaimana cara menghitung harga rata-rata (average price) beberapa layer bid?",
    a: "Harga rata-rata = total nilai beli dibagi total lembar saham. Total nilai beli tiap layer = harga bid x lot x 100 lembar, ditambah fee beli broker. PYSCAL menjumlahkan semua layer otomatis dan menampilkan average price setelah fee.",
  },
  {
    q: "Berapa tick size (fraksi harga) di Bursa Efek Indonesia?",
    a: "Fraksi harga IDX: Rp1 untuk harga di bawah Rp200, Rp2 untuk Rp200–Rp500, Rp5 untuk Rp500–Rp2.000, Rp10 untuk Rp2.000–Rp5.000, dan Rp25 untuk harga Rp5.000 ke atas. PYSCAL membulatkan tiap layer dan target jual ke tick valid supaya order tidak ditolak.",
  },
  {
    q: "Bagaimana menghitung harga break-even setelah fee beli dan jual?",
    a: "Break-even = harga rata-rata x (1 + fee beli) / (1 - fee jual), lalu dibulatkan ke atas mengikuti tick size. Dengan fee beli 0,15% dan fee jual 0,25%, saham di harga rata-rata Rp1.000 baru impas sekitar Rp1.005.",
  },
  {
    q: "Apakah data kalkulasi saya tersimpan di server?",
    a: "Tidak. Semua input, history, dan preset disimpan di localStorage browser Anda. Tidak ada akun, tidak ada login, dan tidak ada data yang dikirim ke server.",
  },
  {
    q: "Apakah PYSCAL bisa dipakai offline?",
    a: "Bisa. PYSCAL adalah PWA: setelah dibuka sekali, service worker menyimpan aplikasi di cache sehingga kalkulator tetap jalan tanpa internet. Anda juga bisa memasangnya ke layar utama lewat tombol Install.",
  },
  {
    q: "Apa bedanya target tick dan target profit persen?",
    a: "Target tick menentukan harga jual sekian fraksi di atas break-even, cocok untuk scalping. Target profit persen menghitung harga jual dari persentase keuntungan bersih yang Anda mau. Keduanya sudah memperhitungkan fee beli dan jual.",
  },
  {
    q: "Apakah PYSCAL memberi rekomendasi saham?",
    a: "Tidak. PYSCAL hanya alat hitung. Semua angka bergantung pada input Anda dan bukan saran investasi. Keputusan beli atau jual sepenuhnya tanggung jawab pengguna.",
  },
];

const HOWTO_STEPS = [
  {
    name: "Isi bid awal dan modal",
    text: "Masukkan harga bid pertama, jumlah lot, dan fee beli-jual broker Anda pada kartu input.",
  },
  {
    name: "Tambah layer bid",
    text: "Tambahkan papan bid berikutnya dengan harga lebih rendah untuk membuat rencana averaging down berlapis.",
  },
  {
    name: "Baca hasil kalkulasi",
    text: "Lihat harga rata-rata, total lot, modal terpakai, break-even setelah fee, dan target jual pada tabel hasil.",
  },
  {
    name: "Simpan preset atau history",
    text: "Simpan skema ke preset per ticker atau simpan hasil ke history agar bisa dibuka lagi kapan saja dari browser yang sama.",
  },
];

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ Kalkulator Pyramid Bid & Averaging Down Saham IDX — PYSCAL" },
      {
        name: "description",
        content:
          "Tanya jawab cara hitung average price, tick size IDX, break-even setelah fee, dan cara pakai kalkulator pyramid bid PYSCAL untuk trader saham Indonesia.",
      },
      {
        property: "og:title",
        content: "FAQ Kalkulator Pyramid Bid & Averaging Down Saham IDX — PYSCAL",
      },
      {
        property: "og:description",
        content:
          "Panduan singkat: average price, fraksi harga IDX, break-even setelah fee, dan langkah pakai PYSCAL.",
      },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "id-ID",
          url: URL,
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "Cara menghitung pyramid bid (averaging down) saham IDX",
          description:
            "Langkah menghitung rencana bid berlapis, harga rata-rata, dan break-even setelah fee dengan PYSCAL.",
          inLanguage: "id-ID",
          totalTime: "PT3M",
          tool: [{ "@type": "HowToTool", name: "PYSCAL Pyramid Bid Calculator" }],
          step: HOWTO_STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text,
            url: `${URL}#langkah-${i + 1}`,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "PYSCAL",
              item: "https://s-calc.lovable.app/",
            },
            { "@type": "ListItem", position: 2, name: "FAQ", item: URL },
          ],
        }),
      },
    ],
  }),
});

function FaqPage() {
  return (
    <main id="main" className="faq-page">
      <nav className="faq-crumb" aria-label="Breadcrumb">
        <Link to="/">PYSCAL</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">FAQ</span>
      </nav>

      <h1 className="faq-title">FAQ: kalkulator pyramid bid & averaging down saham IDX</h1>
      <p className="faq-lead">
        Pertanyaan yang paling sering muncul soal menghitung harga rata-rata, fraksi harga BEI,
        break-even setelah fee, dan cara pakai PYSCAL.
      </p>

      <section aria-labelledby="howto-h">
        <h2 id="howto-h" className="faq-h2">
          Cara pakai dalam 4 langkah
        </h2>
        <ol className="faq-steps">
          {HOWTO_STEPS.map((s, i) => (
            <li key={s.name} id={`langkah-${i + 1}`}>
              <strong>{s.name}.</strong> {s.text}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="faq-h">
        <h2 id="faq-h" className="faq-h2">
          Pertanyaan umum
        </h2>
        <div className="faq-list">
          {FAQS.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>
                <h3>{f.q}</h3>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="faq-cta">
        <Link to="/">Buka kalkulator PYSCAL &rarr;</Link>
      </p>
    </main>
  );
}
