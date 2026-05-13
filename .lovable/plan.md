
# Plan: Port SCALC → PYSCAL (1:1, Local-Only)

## Konsep
- **Local only**: semua state di `localStorage`. Tanpa auth, tanpa Cloud, tanpa backend.
- **No opex**: deploy static (Lovable published URL).
- **1:1 port**: semua fitur file existing dipertahankan persis.
- **Rebrand**: nama → **PYSCAL**. Palette: navy dark + white.
- **Payment**: di luar app (gateway eksternal, ditentukan nanti). App tidak punya gate.

## Branding PYSCAL
- **Nama**: PYSCAL (semua occurrence `SCALC` / `scalc` diganti)
- **Tagline**: "Pyramid Bid Calculator" (atau bebas, default itu dulu)
- **Palette** (oklch tokens di `src/styles.css`):
  - Dark mode: bg navy `oklch(0.18 0.04 250)`, surface `oklch(0.22 0.04 250)`, border `oklch(0.30 0.03 250)`, text white `oklch(0.98 0 0)`, accent white
  - Light mode: bg white, surface `oklch(0.98 0 0)`, border `oklch(0.92 0.01 250)`, text navy `oklch(0.18 0.04 250)`, accent navy
  - Semantic: green `oklch(0.70 0.18 145)`, red `oklch(0.62 0.23 25)` (untuk P/L)
- **Logo**: mark sederhana huruf "P" navy/white (bisa diiterasi nanti)
- **Typography**: Geist + Geist Mono (gratis, modern)

## Scope fitur (1:1 dari file)
Semua dipindah persis tanpa pengurangan:
- Compute engine: `getTickSize`, `ceilTick`, `checkLot`, `computeRows` (binary search lot, profit multiplier dari fee buy/sell + target%, tick dari avg final)
- Mode **Entry** (new) & **Position** (existing avg + lot, raw avg conversion)
- **Custom Lot Override** (lock/unlock, seed dari computed)
- Validasi: warning bid naik, under-target check
- Tambah/hapus/reset papan, swipe-to-delete (mobile, axis detection)
- **BidStepper**: ▲▼ tick-aware, haptic vibrate
- **Settings panel**: balance, fee buy/sell, theme light/dark, preset CRUD, import/export JSON, shortcut customizer (recorder)
- **Preset chips** + flash animation saat load
- **History** (cap 500): save 1-click, view detail, delete
- **Undo/Redo** (cap 50, debounce 800ms, structural vs input)
- **Keyboard shortcuts** (recordable, persisted)
- **Copy results** (plain text + emoji header, fallback `execCommand`)
- **Terbilang** Indo (rb/jt/mlr/T)
- **Toast system** (success/error, action button untuk undo delete)

## Arsitektur

```
src/
├── routes/
│   ├── __root.tsx                    # head/meta + theme bootstrap (no FOUC)
│   └── index.tsx                     # halaman calc (single page)
├── styles.css                        # tokens oklch + Geist import
├── lib/
│   ├── compute.ts                    # tick/ceilTick/checkLot/computeRows
│   ├── format.ts                     # n, nDec, nShort, terbilang, fmtPct, fmtTime
│   ├── storage.ts                    # loadState/saveState, presets, history, shortcuts
│   └── shortcuts.ts                  # eventMatchesShortcut, shortcutToString, defaults
├── hooks/
│   ├── use-undo-redo.ts
│   ├── use-toast.ts
│   └── use-keyboard-shortcuts.ts
└── components/
    ├── Header.tsx
    ├── ModeToggle.tsx
    ├── PresetChips.tsx
    ├── InputCard.tsx
    ├── ExistingCard.tsx
    ├── PapanList.tsx + PapanRow.tsx
    ├── BidStepper.tsx
    ├── SwipeableCard.tsx
    ├── ResultsTable.tsx
    ├── SummaryBar.tsx
    ├── CautionBar.tsx
    ├── SettingsPanel.tsx + ShortcutRecorder.tsx
    ├── HistoryDrawer.tsx
    ├── ToastStack.tsx
    └── icons.tsx
```

Catatan teknis:
- TanStack Start (template), `routes/index.tsx` = single page, full client
- Komponen yang baca `localStorage` di-guard `typeof window !== 'undefined'` untuk SSR safety
- CSS in-string `<style>` dibuang → semua jadi class Tailwind v4 + tokens (`bg-surface`, `text-foreground`, dst.). Tidak ada hex literal di komponen
- Theme persist `pyscal_theme`. Hindari flash dgn inline script kecil di `__root.tsx <head>`
- Tidak nambah dependency (cuma yang sudah ada)
- TypeScript strict: type `Bid`, `Preset`, `Trade`, `Snapshot`, `Shortcut`

## Migrasi storage
Semua key di-rename: `scalc_state` → `pyscal_state`, `scalc_presets` → `pyscal_presets`, `scalc_history` → `pyscal_history`, `scalc_shortcuts` → `pyscal_shortcuts`, `scalc_theme` → `pyscal_theme`.

**1× migration script** di `lib/storage.ts`: saat load pertama, kalau `scalc_*` ada dan `pyscal_*` belum → copy lalu hapus yang lama. Idempotent, jalan sekali.

## Step pengerjaan
1. Setup tokens navy+white di `styles.css` + import Geist + ganti meta title ke "PYSCAL"
2. Port `lib/compute.ts` (jaga numerik identik dgn file asli)
3. Port `lib/format.ts` + `lib/storage.ts` (dgn migrasi) + `lib/shortcuts.ts`
4. Port hooks (`use-undo-redo`, `use-toast`, `use-keyboard-shortcuts`)
5. Build UI top-down: Header → ModeToggle → PresetChips → InputCard/ExistingCard → PapanList → ResultsTable → SummaryBar → CautionBar
6. SettingsPanel + ShortcutRecorder + preset import/export
7. HistoryDrawer + save/view/delete
8. SwipeableCard + BidStepper (mobile)
9. ToastStack + wire semua action
10. QA: hasil compute identik dgn file asli untuk skenario entry, position, custom lot. Cek mobile swipe, semua shortcut, undo/redo

## Di-skip (disimpan untuk nanti, sesuai request)
- Landing page / pricing
- PWA / offline / install to home screen
- Onboarding tour / tooltip
- SEO meta lengkap, OG image, sitemap
- Analytics
- Share state via URL
- Backup/restore full state
- License key gate

## Output akhir
- Single-page app PYSCAL, full client, full local
- Hasil compute & UX identik dgn file asli
- Codebase rapi, modular, theme via token
- Siap publish → kasih link ke buyer setelah bayar di gateway eksternal
