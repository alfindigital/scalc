"""Footer & social buttons E2E — tap targets, a11y, dark mode consistency.

Runs against the dev server at http://localhost:8080 by default; override
with PYSCAL_E2E_URL. No SW/PWA dependency — this is a pure UI audit.
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

VIEWPORTS = [
    ("w320",       {"width": 320, "height": 720}),
    ("w375",       {"width": 375, "height": 812}),
    ("w425",       {"width": 425, "height": 800}),
    ("w768",       {"width": 768, "height": 1024}),
    ("landscape",  {"width": 812, "height": 375}),
]

MIN_TAP = 44  # WCAG 2.5.5 / Apple HIG
results = []

def rec(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


async def audit_viewport(browser, name, viewport):
    ctx = await browser.new_context(viewport=viewport, has_touch=True, is_mobile=viewport["width"] < 768)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector(".afd-foot")
    await page.evaluate("document.querySelector('.afd-foot')?.scrollIntoView()")
    await page.wait_for_timeout(200)

    foot_box = await page.locator(".afd-foot").bounding_box()
    rec(f"{name} footer visible", foot_box is not None and foot_box["height"] > 0,
        f"h={foot_box['height'] if foot_box else 'n/a'}px")

    # Tap-target audit on all social links (each anchor must be >=44 in mobile widths)
    links = page.locator(".afd-rot a.afd-item")
    count = await links.count()
    rec(f"{name} 4 social links present", count == 4, f"got {count}")

    # Accessibility attrs
    for i in range(count):
        aria = await links.nth(i).get_attribute("aria-label")
        ok = bool(aria) and "(" in aria and len(aria) > 6
        rec(f"{name} link[{i}] aria-label", ok, aria or "MISSING")

    if viewport["width"] <= 768:
        # In mobile CSS all items get min 44x44 (even inactive) — measure via getBoundingClientRect
        sizes = await page.evaluate("""
          () => Array.from(document.querySelectorAll('.afd-rot a.afd-item')).map(a => {
            const r = a.getBoundingClientRect();
            return { w: r.width, h: r.height };
          })
        """)
        all_ok = all(s["w"] >= MIN_TAP and s["h"] >= MIN_TAP for s in sizes)
        rec(f"{name} tap targets >= {MIN_TAP}px", all_ok, str(sizes))

    # Footer height consistent (compact but visible). Accept 40-90px band across mobile/tablet widths.
    h = foot_box["height"] if foot_box else 0
    rec(f"{name} footer height in [40,90]", 40 <= h <= 90, f"{h:.0f}px")

    # Focus visibility: tab into the first link, check computed outline
    await page.evaluate("document.querySelector('.afd-rot a.afd-item')?.focus()")
    outline = await page.evaluate("""
      () => {
        const el = document.activeElement;
        const s = getComputedStyle(el);
        return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor };
      }
    """)
    ok = outline["outlineStyle"] != "none" and outline["outlineWidth"] not in ("0px", "")
    rec(f"{name} focus outline visible", ok, str(outline))

    # Dark mode toggle: set data-pyscal-theme="dark" and verify footer colors change
    await page.evaluate("document.documentElement.setAttribute('data-pyscal-theme','dark')")
    await page.wait_for_timeout(120)
    dark_bg = await page.evaluate("getComputedStyle(document.querySelector('.afd-foot')).backgroundColor")
    rec(f"{name} dark footer bg", "17, 26, 46" in dark_bg or "rgb(17" in dark_bg, dark_bg)

    await page.screenshot(path=str(OUT / f"footer_{name}.png"))
    await page.evaluate("document.documentElement.removeAttribute('data-pyscal-theme')")
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, vp in VIEWPORTS:
            await audit_viewport(browser, name, vp)
        await browser.close()
    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        for n, _, d in fails:
            print(f"  FAIL: {n} — {d}")
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())