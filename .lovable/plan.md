## Konteks & Status Saat Ini

Sudah ada di codebase (jadi tidak perlu dibangun dari nol):
- `public/manifest.webmanifest` lengkap + icon set (192/512/maskable/apple-touch/favicon), `<link rel="manifest">` + `theme-color` di `__root.tsx`. **PYSCAL sudah installable manifest-only — yang belum: service worker untuk offline-first.**
- History sudah punya: simpan, search, rename, pin, hapus, export backup JSON. **Yang belum: "Recall" (load entry kembali ke form input).**
- Shortcuts map + recorder + tooltip `title=` di banyak tombol sudah jalan.
- Validasi sekarang: warning bid harus turun (`warns` di line 1254), toast error untuk file invalid. **Belum ada: inline error per-field, range warning kontekstual, tooltip penjelas tiap field.**

Plan ini fokus ke gap di atas, bukan rebuild yang sudah jalan.

---

## 1. PWA Offline-First (Service Worker)

User secara eksplisit minta SW + offline-first. Karena project guideline melarang SW liar di iframe preview, pakai pola **opt-in dengan iframe/preview guard** (sama seperti yang dipakai project lain Lovable).

### Yang dikerjakan
- Tulis SW statis di `public/sw.js` (tanpa `vite-plugin-pwa`, tanpa Workbox — minim dependensi). Strategi:
  - **App shell precache**: list aset hasil build di-inject lewat fetch `__BUILD_ID__` ringan; untuk simplicity v1 pakai **runtime cache** saja (cache-on-first-load) → tidak perlu manifest precache yang fragile.
  - **Navigation requests (`request.mode === 'navigate'`)**: `NetworkFirst` dengan timeout 3 detik, fallback ke cached `/`.
  - **Static assets** (`/_build/*`, `/assets/*`, fonts, icons): `StaleWhileRevalidate`.
  - **Skip cross-origin** (Google Fonts CDN, dst): pass-through fetch.
  - Versioned cache name `pyscal-v1` — kalau dibump, cleanup cache lama di `activate`.
- Tulis loader `src/lib/pwa.ts` yang:
  - Cek `window.self !== window.top` (iframe) → **unregister semua SW** (kill-switch buat editor preview Lovable).
  - Cek hostname mengandung `id-preview--` atau `lovableproject.com` → unregister + skip.
  - Else (production `pyscal.lovable.app` + standalone install): `navigator.serviceWorker.register('/sw.js')`.
  - Listen `controllerchange` → tampilkan toast "Versi baru tersedia, reload" (pakai `showToast` yang sudah ada).
- Panggil loader sekali di `src/routes/__root.tsx` (client-only via `useEffect`).
- **Install prompt UI**: tangkap `beforeinstallprompt`, simpan ke ref, tampilkan tombol "Install App" kecil di Settings panel section "Backup & Restore" → trigger `prompt()`. Sembunyikan kalau `display-mode: standalone` aktif atau event tidak pernah fired (iOS Safari).
- Tambahkan dokumentasi singkat di Settings: "Offline-first aktif di versi published. Editor preview sengaja tanpa SW."

### Risiko & mitigasi
- SW yang nyangkut di device user lama → cache name versioned + `activate` cleanup. Kalau perlu hard-reset di rilis depan, bump nama cache.
- iOS quirk: `beforeinstallprompt` tidak ada — fallback instruksi manual "Share → Add to Home Screen" di Settings.

---

## 2. Keyboard Shortcuts & Accessibility Audit

Shortcut sudah jalan. Fokus ke **a11y + interaksi keyboard** yang masih bolong.

### Yang dikerjakan
- **Tab order audit**: pastikan urutan logis Input card → Papan list → Action buttons → Results. Tambah `tabIndex={0}` di card interaktif yang perlu, hapus dari yang seharusnya skip.
- **Focus ring**: tambah `*:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }` di `src/styles.css`. Pastikan tidak konflik dengan custom focus existing.
- **ARIA labels**: audit semua `<button>` icon-only (sudah banyak ada `aria-label`, tapi cek line 1467, 1612, 2074 dll konsisten). Tambah `aria-pressed` di toggle buttons (Mode entry/position, Custom Lot, Pin).
- **Live regions**: bungkus toast stack dengan `role="status" aria-live="polite"`. Untuk error toast: `role="alert" aria-live="assertive"`.
- **Dialog semantics**: Settings, History, ShortcutRecorder → tambah `role="dialog" aria-modal="true" aria-labelledby="..."`. Focus trap sederhana (focus pertama input/button saat open, restore focus ke trigger saat close). Esc untuk close (sebagian sudah jalan, audit semua).
- **Keyboard interaksi spesifik user**:
  - **Enter** di input numeric → blur + trigger recompute (sebenarnya auto-compute on change, jadi Enter cukup pindah focus ke input berikut via `enterKeyHint="next"`).
  - **Esc** di luar dialog → kalau ada papan terisi, tampilkan confirm "Reset semua papan?" pakai shortcut `resetPapan` yang sudah ada (atau cukup close dialog terdekat — lebih aman).
- **Mobile keyboard**: tambah `inputMode="decimal"` + `enterKeyHint="next"` di semua `<input type="number">` (line 1530, 1535, 1543, 1548, 1553, 1558, 1696, 1709, 1714, 1830, 1900).
- **Skip link**: `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` di top of body.
- **Heading hierarchy check**: pastikan ada `<h1>PYSCAL</h1>` tunggal, section pakai `<h2>`/`<h3>` urut.
- **Kontras**: audit `var(--text-d)` dan `var(--text-m)` di atas `var(--surface)` — kalau di bawah AA 4.5:1, naikkan luminance di `styles.css`.

---

## 3. History — Recall + UX Polish

History sudah punya save/rename/pin/delete/export. Yang user sebut tapi belum ada: **Recall** (muat ulang entry ke form).

### Yang dikerjakan
- Tambah tombol "Recall" (icon arrow-left atau replay) di setiap `.history-item`, di sebelah Pin/Rename/Delete.
- Handler `recallTrade(entry)`:
  - Konfirmasi: "Muat papan ini ke kalkulator? State saat ini akan ter-replace (bisa di-undo)."
  - Push state lama ke undo stack.
  - Apply: `setBids(entry.bids)`, `setBaseLot`, `setMode`, `setExistingAvg`, `setExistingLot`, `setCustomLots`, dll dari snapshot di entry.
  - Close history drawer + toast "Recalled".
- **Pastikan saveTrade menyimpan snapshot lengkap** (cek line ~970): kalau belum, perluas shape entry agar bisa di-recall presisi (`bids`, `baseLot`, `mode`, `existingAvg`, `existingLot`, `customLots`, `targetTicks`, `targetProfit`).
- **Migrasi schema history v2→v3**: entry lama tanpa snapshot → tombol Recall di-disable + tooltip "Entry lama, tidak bisa di-recall".
- **Export per-entry**: tambah opsi "Export entry ini sebagai CSV" di detail history (selain backup global yang sudah ada).

---

## 4. Validasi Input — Inline + Range + Tooltip

### Aturan validasi per field
| Field | Hard min/max | Soft warning |
|---|---|---|
| Bid awal | > 0 | < 50 atau > 50000 → "Harga di luar range IDX umum (50–50.000)" |
| Base lot | ≥ 1 | bukan kelipatan praktis lot |
| Target ticks | 1–20 | > 10 → "Target ticks sangat agresif" |
| Target profit % | 0–50 | > 5 → "Target profit > 5% per pyramid, double-check" |
| Fee buy | 0–1 | > 0.5 → "Fee buy tinggi, cek broker" |
| Fee sell | 0–1 | > 0.5 → "Fee sell tinggi, cek broker" |
| Balance | ≥ 0 | — |
| Existing avg | > 0 (mode position) | range IDX sama spt bid awal |
| Existing lot | ≥ 1 (mode position) | — |
| Bid berikutnya | < bid sebelumnya | sudah ada warning |

### Yang dikerjakan
- Bangun `src/lib/validation.ts` (pure functions, ada test Vitest): `validateField(name, value, ctx) → { error?: string; warning?: string }`.
- Komponen kecil `<FieldHint>` di `src/components/pyscal/FieldHint.tsx`: render warning kuning / error merah inline di bawah input, dengan icon + `role="alert"` (error) atau `role="status"` (warning).
- **Tooltip per field**: tambah icon `(?)` di sebelah label setiap field input → hover/focus tampilkan penjelasan singkat (pakai shadcn `Tooltip` yang sudah ter-install). Contoh:
  - "Bid awal" → "Harga limit order pertama. Sistem akan turunkan untuk averaging-down."
  - "Target ticks" → "Berapa tick di atas average price untuk target jual."
  - "Fee buy/sell" → "Persentase fee broker (default 0.15% / 0.25%)."
- Style validasi di `styles.css`: `.if[aria-invalid="true"] { border-color: var(--red); }` + state warning oranye.
- Submit-time: kalau ada error hard, tombol "Tambah Papan" disabled + tooltip "Perbaiki input dulu".

---

## Urutan Eksekusi & File Yang Disentuh

1. **Validation lib + tests** — `src/lib/validation.ts`, `src/lib/validation.test.ts` (paling aman, tanpa risiko UI).
2. **A11y CSS + inputMode** — `src/styles.css`, edit semua `<input type="number">` di `Pyscal.tsx`. Skip link di `__root.tsx`.
3. **Tooltip + FieldHint** — `src/components/pyscal/FieldHint.tsx`, integrate di InputCard area `Pyscal.tsx`.
4. **History Recall** — extend `saveTrade` snapshot, tambah `recallTrade`, tombol di history item, migrasi schema v3 di `storage.ts`.
5. **Dialog a11y** — Settings/History/ShortcutRecorder `role="dialog"` + focus trap (helper kecil di `src/hooks/useFocusTrap.ts`).
6. **PWA SW** — `public/sw.js`, `src/lib/pwa.ts`, register di `__root.tsx`, install prompt button di Settings.

Tidak ada dependency baru. Tidak ada perubahan business logic `compute.ts`/`format.ts`. Refactor split file `Pyscal.tsx` yang ada di `.lovable/plan.md` lama **di-skip** di sini — di luar scope user request.

## Yang TIDAK dikerjakan (sengaja)
Charts/visualisasi, presets baru, i18n, share permalink, OG image dinamis, tool baru (water chemistry dll), analytics, copy-as-PNG. Itu nanti.
