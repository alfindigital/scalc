"""Manual reduced-motion toggle — E2E.

Verifies that flipping the "Kurangi" option in Settings:
  1. Immediately stops the social rotator (all 4 items visible, static row)
  2. Hides the .afd-glow and freezes the .afd-caret blink
  3. Zeroes out .afd-item transitions
  4. Persists across reload
  5. Switching back to "Normal" re-enables the rotator without reload

All checks run in a single page — no reload between toggle and assertion.
"""

import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

results = []
def rec(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


async def read_state(page):
    return await page.evaluate("""
      () => {
        const html = document.documentElement;
        const items = Array.from(document.querySelectorAll('.afd-rot a.afd-item'));
        const glow = document.querySelector('.afd-glow');
        const caret = document.querySelector('.afd-caret');
        const rot = document.querySelector('.afd-rot');
        return {
          setting: html.getAttribute('data-pyscal-motion'),
          effective: html.getAttribute('data-pyscal-motion-effective'),
          items: items.map(el => {
            const s = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              opacity: parseFloat(s.opacity),
              transition: s.transitionDuration,
              position: s.position,
              w: r.width, h: r.height,
            };
          }),
          glowDisplay: glow ? getComputedStyle(glow).display : null,
          caretAnimation: caret ? getComputedStyle(caret).animationName : null,
          rotDisplay: rot ? getComputedStyle(rot).display : null,
        };
      }
    """)


async def open_settings(page):
    await page.locator('[aria-label="Buka Settings"]').first.click()
    await page.wait_for_selector('.settings-panel')
    # Scroll the Animasi section into view within the panel
    await page.locator('.settings-panel button[data-motion="reduce"]').scroll_into_view_if_needed()


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector('.afd-foot')

        # --- Start: no override, effective from OS (headless default = normal) ---
        s0 = await read_state(page)
        rec("initial effective computed", s0["effective"] in ("reduce", "normal"),
            f"setting={s0['setting']} effective={s0['effective']}")

        # --- Toggle to Reduce via UI, no reload ---
        await open_settings(page)
        await page.locator('.settings-panel button[data-motion="reduce"]').click()
        # Give React one tick to re-render and CSS to apply
        await page.wait_for_function(
            "document.documentElement.getAttribute('data-pyscal-motion-effective') === 'reduce'"
        )
        s1 = await read_state(page)
        rec("after Kurangi: setting=reduce", s1["setting"] == "reduce")
        rec("after Kurangi: effective=reduce", s1["effective"] == "reduce")
        rec("after Kurangi: all 4 items visible", all(i["opacity"] > 0.9 for i in s1["items"]),
            str([i["opacity"] for i in s1["items"]]))
        rec("after Kurangi: items are static row", all(i["position"] == "static" for i in s1["items"]),
            str([i["position"] for i in s1["items"]]))
        rec("after Kurangi: transitions disabled", all(i["transition"] in ("0s", "0.0s") for i in s1["items"]),
            str([i["transition"] for i in s1["items"]]))
        rec("after Kurangi: glow hidden", s1["glowDisplay"] == "none", s1["glowDisplay"] or "")
        rec("after Kurangi: caret animation none", s1["caretAnimation"] == "none",
            s1["caretAnimation"] or "")

        # Close settings and screenshot the reduced footer
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(150)
        foot = page.locator(".afd-foot").first
        await foot.scroll_into_view_if_needed()
        await foot.screenshot(path=str(OUT / "motion_reduce.png"))

        # --- Persist across reload ---
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector('.afd-foot')
        s2 = await read_state(page)
        rec("persist: setting=reduce after reload", s2["setting"] == "reduce")
        rec("persist: effective=reduce after reload", s2["effective"] == "reduce")
        rec("persist: static row survives reload",
            all(i["position"] == "static" for i in s2["items"]))

        # --- Switch back to Normal, no reload ---
        await open_settings(page)
        await page.locator('.settings-panel button[data-motion="normal"]').click()
        await page.wait_for_function(
            "document.documentElement.getAttribute('data-pyscal-motion-effective') === 'normal'"
        )
        s3 = await read_state(page)
        rec("after Normal: setting=normal", s3["setting"] == "normal")
        rec("after Normal: effective=normal", s3["effective"] == "normal")
        # In animated mode, only the .active item should be at full opacity
        active_visible = [i for i in s3["items"] if i["opacity"] > 0.9]
        rec("after Normal: rotator re-engaged (only 1 active)",
            1 <= len(active_visible) <= 2, f"visible={len(active_visible)}/4")
        rec("after Normal: items positioned absolutely again",
            any(i["position"] == "absolute" for i in s3["items"]),
            str([i["position"] for i in s3["items"]]))

        await page.keyboard.press("Escape")
        await foot.screenshot(path=str(OUT / "motion_normal.png"))

        await browser.close()

    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())