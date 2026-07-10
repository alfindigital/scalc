"""PYSCAL PWA E2E — SW registration, offline navigation, update toast.

Run against a production build served at http://localhost:4173.
Assumes the SW registration guard has been bypassed via ?e2e-sw=1 (which
persists in sessionStorage so subsequent reloads keep the SW active).
"""

import asyncio
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:4173")
ROOT = Path(__file__).resolve().parents[2]
SW_PATH = ROOT / "public" / "sw.js"
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

DEVICES = [
    ("desktop", {"viewport": {"width": 1280, "height": 900}}),
    ("mobile",  {"viewport": {"width": 390,  "height": 844},
                 "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                               "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                 "is_mobile": True, "has_touch": True, "device_scale_factor": 3}),
]

results = []
def record(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))

async def wait_for_sw(page, timeout=10000):
    return await page.wait_for_function(
        "() => navigator.serviceWorker.controller !== null",
        timeout=timeout,
    )

async def register_sw(page):
    """Force-register /sw.js from the page context (belt & suspenders)."""
    await page.evaluate("""
        async () => {
          if ('serviceWorker' in navigator) {
            try { await navigator.serviceWorker.register('/sw.js'); } catch {}
          }
        }
    """)

async def run_device(pw, label, device_opts):
    print(f"\n=== Device: {label} ===")
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(**device_opts)
    page = await context.new_page()

    # T1: SW registers under ?e2e-sw=1
    try:
        await page.goto(f"{BASE}/?e2e-sw=1", wait_until="networkidle")
        # Belt & suspenders: also register directly.
        await register_sw(page)
        await page.wait_for_timeout(500)
        await page.reload(wait_until="domcontentloaded")
        await wait_for_sw(page, timeout=15000)
        ctrl = await page.evaluate("() => !!navigator.serviceWorker.controller")
        await page.screenshot(path=str(OUT / f"{label}_1_sw.png"))
        record(f"{label}/T1 SW registers", ctrl, f"controller={ctrl}")
    except Exception as e:
        await page.screenshot(path=str(OUT / f"{label}_1_sw_FAIL.png"))
        record(f"{label}/T1 SW registers", False, repr(e))
        await browser.close()
        return

    # T2: Offline navigation still renders the app shell
    try:
        await context.set_offline(True)
        await page.reload(wait_until="domcontentloaded", timeout=8000)
        # H1 or main content should appear (PYSCAL brand)
        await page.wait_for_selector("text=/PYSCAL/i", timeout=8000)
        await page.screenshot(path=str(OUT / f"{label}_2_offline.png"))
        record(f"{label}/T2 Offline nav renders", True)
    except Exception as e:
        await page.screenshot(path=str(OUT / f"{label}_2_offline_FAIL.png"))
        record(f"{label}/T2 Offline nav renders", False, repr(e))
    finally:
        await context.set_offline(False)

    # T3: Update toast — bump sw.js VERSION on disk, then reload.
    # Only the first device pass mutates public/sw.js; the second device reuses the bumped file.
    if label == "desktop":
        original = SW_PATH.read_text()
        bumped = re.sub(r"pyscal-v\d+", lambda m: m.group(0) + "-e2e", original, count=2)
        if bumped == original:
            record(f"{label}/T3 Update toast", False, "could not bump sw.js version regex")
        else:
            SW_PATH.write_text(bumped)
            # The served /sw.js is copied by the build into dist/client/.
            served_sw = ROOT / "dist" / "client" / "sw.js"
            if served_sw.exists():
                served_sw.write_text(bumped)
            try:
                await page.reload(wait_until="networkidle")
                # Force SW update check — browsers only auto-check on 24h boundary.
                await page.evaluate("""
                    async () => {
                      const reg = await navigator.serviceWorker.getRegistration();
                      if (reg) await reg.update();
                    }
                """)
                # Wait for the toast content
                await page.wait_for_selector("text=Versi baru PYSCAL tersedia", timeout=15000)
                await page.wait_for_selector("text=Reload sekarang", timeout=5000)
                await page.screenshot(path=str(OUT / f"{label}_3_update.png"))
                # Verify the calc is still interactive (offline-safe: user hasn't clicked Reload yet)
                interactive = await page.evaluate(
                    "() => !!document.querySelector('input[type=\"number\"]')"
                )
                record(f"{label}/T3 Update toast", interactive,
                       "toast shown; calculator still interactive")
            except Exception as e:
                await page.screenshot(path=str(OUT / f"{label}_3_update_FAIL.png"))
                record(f"{label}/T3 Update toast", False, repr(e))
            finally:
                SW_PATH.write_text(original)
                if served_sw.exists():
                    served_sw.write_text(original)

    await browser.close()

async def main():
    async with async_playwright() as pw:
        for label, opts in DEVICES:
            await run_device(pw, label, opts)

    ok = sum(1 for _, o, _ in results if o)
    total = len(results)
    print(f"\n=== {ok}/{total} passed ===")
    sys.exit(0 if ok == total else 1)

if __name__ == "__main__":
    asyncio.run(main())
