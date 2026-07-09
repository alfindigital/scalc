# PYSCAL E2E — PWA smoke test

Verifies service worker registration, offline navigation, and the SW update toast on a real production build.

## Run

```bash
# 1. build production bundle
bun run build

# 2. serve the built client statically on :4173 (SPA fallback to index.html)
bunx --bun serve -s .output/public -l 4173 &
SERVE_PID=$!

# 3. run tests (Chromium via python-playwright, pre-installed in Lovable sandbox)
python3 tests/e2e/pwa.spec.py

# 4. cleanup
kill $SERVE_PID
```

## What it checks

- **T1 SW registers**: navigates to `/?e2e-sw=1` and asserts `navigator.serviceWorker.controller` becomes non-null after a reload.
- **T2 Offline nav**: sets the browser context offline, reloads `/`, asserts the app still renders (root H1 visible) — proves the cached shell is served by the SW.
- **T3 Update toast**: rewrites `public/sw.js` cache version, rebuilds, reloads; asserts a toast with text "Versi baru PYSCAL tersedia" and a "Reload sekarang" button appears without auto-reloading the calculator.

Tests emulate both desktop Chromium and an iPhone 13 viewport (from Playwright device descriptors) to cover the "beberapa perangkat" requirement without needing real hardware.

The `?e2e-sw=1` flag flips a session-storage bit in `src/lib/pwa.ts` that bypasses the localhost preview guard so the SW registers under `localhost`. Production hosts are unaffected.
