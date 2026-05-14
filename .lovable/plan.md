## Tujuan
Naikkan PYSCAL dari "satu file 2000 baris yang jalan" jadi codebase sehat + UX mobile-first + 2 power feature (Export/Import JSON, PWA installable offline) + branding dengan logo piramida. Tetap no-auth, no-backend, no-opex, local-first.

## Wave 1 — Foundation (refactor konservatif + safety net)

Pecah `src/components/Pyscal.tsx` (1989 LoC) jadi modul, behavior 1:1, tanpa rewrite logika.

Struktur target:
```text
src/
  lib/
    compute.ts          // getTickSize, ceilTick, checkLot, computeRows
    format.ts           // number/currency/terbilang
    storage.ts          // load/save state, presets, history, shortcuts, schema versioning + migrasi scalc→pyscal
    shortcuts.ts        // shortcut map + shortcutToString (SSR-safe)
  hooks/
    useUndoRedo.ts
    useToast.ts
    useKeyboard.ts
    useLocalStorage.ts
  components/pyscal/
    Pyscal.tsx          // shell tipis, compose komponen
    Header.tsx
    ModeToggle.tsx
    InputCard.tsx
    PapanList.tsx + PapanRow.tsx + BidStepper.tsx
    SwipeableCard.tsx
    ResultsTable.tsx
    SummaryBar.tsx
    CautionBar.tsx
    SettingsPanel.tsx
    ShortcutRecorder.tsx
    HistoryDrawer.tsx
    ToastStack.tsx
    icons.tsx
```

Tambahan safety:
- Pindahkan palette navy/white ke `src/styles.css` sebagai oklch tokens (`--background`, `--foreground`, `--surface`, `--border`, `--brand`, `--success`, `--danger`). Komponen pakai `bg-background`, `text-foreground` dst — tidak ada hex inline lagi.
- Schema versioning di `lib/storage.ts`: `pyscal_state` simpan `{ version: 2, data: ... }`, `loadState` auto-migrate v1→v2, fallback default kalau corrupt.
- Error boundary di `src/routes/__root.tsx` + `errorComponent` di `index.tsx` dengan tombol "Reset state".
- Unit test Vitest untuk `lib/compute.ts` dan `lib/format.ts`: tick size per harga band, ceilTick rounding, checkLot validity, computeRows untuk skenario Entry & Position, terbilang ID (ribuan/jutaan/miliar/triliun, koma).

## Wave 2 — UX & Mobile polish

- Aksesibilitas: `aria-label` di semua icon button, `role="dialog"` + focus-trap untuk Settings/History/ShortcutRecorder, `Esc` close, audit kontras WCAG AA navy/white.
- Mobile:
  - `inputMode="decimal"` + `enterKeyHint` di semua numeric input
  - tap target ≥ 44×44 px (stepper, swipe handle, close button)
  - haptic ringan di swipe-delete (`navigator.vibrate(10)` kalau ada)
  - Settings & History jadi bottom-sheet di breakpoint `<768px`, modal di desktop
- Empty state Papan list: ilustrasi tipis + CTA "Tambah papan pertama" + contoh angka prefilled di first run (dismiss permanen via `pyscal_onboarded`).
- Undo/redo button visible di header (selain shortcut), disabled state benar.
- History drawer: search box (filter by note/tanggal), rename entry inline, pin (sort pinned di atas).
- Keyboard cheatsheet modal trigger `?` (hint kecil di footer).

## Wave 3 — Power features (no-opex)

### Export/Import state JSON
- Tombol di Settings → "Backup & Restore"
- Export: serialize `{ version, exportedAt, state, presets, history, shortcuts }` → download `pyscal-backup-YYYYMMDD-HHmm.json`
- Import: file picker → validasi schema (zod, sudah ada di project) → konfirmasi modal "Replace / Merge / Cancel" → apply + toast.

### PWA installable + offline (manifest-only, tanpa service worker)
Sesuai aturan project: HINDARI service worker karena ganggu preview iframe. Jadi pendekatan **manifest-only**:
- `public/manifest.webmanifest` dengan `display: "standalone"`, `start_url: "/"`, `theme_color`, `background_color: #0B1220`, icon set 192/512/maskable.
- `<link rel="manifest">` + `apple-touch-icon` + `theme-color` meta di `__root.tsx`.
- Tidak install `vite-plugin-pwa`. Tidak ada SW. Hasil: installable + ikon home screen + standalone display, tapi offline support depends on browser HTTP cache (cukup untuk app yang udah local-first; semua state di localStorage jadi tetap jalan tanpa internet setelah pertama kali load).
- Kalau user nanti benar-benar butuh offline-guaranteed, tambahkan SW di iterasi terpisah dengan iframe-guard.

## Wave 4 — Branding (logo piramida)

- Generate logo piramida (3 tingkat / staircase) navy `#0B1220` di atas putih + invers untuk dark mode, transparent PNG via imagegen premium.
- File: `src/assets/logo-pyscal.png` (mark) + `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/favicon.ico`, `public/apple-touch-icon.png`.
- Header: ganti teks "PYSCAL" jadi `<logo> PYSCAL` (logo 24px).
- Update `__root.tsx` favicon links + `og:image` ke logo 1200×630 social card.

## Urutan eksekusi

1. Wave 1 refactor (pecah file, tokens, storage versioning, error boundary)
2. Wave 1 tests (Vitest compute + format)
3. Wave 2 a11y + mobile polish + bottom-sheet
4. Wave 2 history search/rename/pin + cheatsheet
5. Wave 3 Export/Import JSON
6. Wave 3 PWA manifest-only
7. Wave 4 generate logo + wire favicons + og:image

## Hal teknis penting

- Refactor murni mekanis, tidak menyentuh signature `computeRows` dst — biar test bisa ditulis langsung dari behavior existing.
- Migrasi key `scalc_*` → `pyscal_*` yang sudah ada tetap dipertahankan; schema versioning ditambahkan di atasnya (`v1 = legacy renamed`, `v2 = wrapped { version, data }`).
- Tidak menambah dependency baru kecuali: `vitest` (dev) untuk tes, `html-to-image` TIDAK dipakai (di-skip karena user tidak pilih copy-as-PNG).
- PWA: NO service worker, NO `vite-plugin-pwa`. Hanya manifest + icons + meta tags.
- Semua perubahan styling pakai design tokens `src/styles.css` oklch — tidak ada hex hardcode di komponen.

## Yang TIDAK dikerjakan (sesuai keputusan sebelumnya)
Landing page, pricing, paywall, payment gateway, auth, onboarding tour panjang, analytics, SEO lanjutan, share-to-WA, copy-as-PNG, bilingual terbilang, Zustand.
