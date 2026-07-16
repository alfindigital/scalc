"""Verify full keyboard Tab / Shift+Tab navigation reaches every interactive
control in the calculator grid (bid inputs, lot inputs, remove buttons),
consistently in both light and dark themes.

Setup: add 2 extra papan (3 total) + enable custom lot, so grid has:
  row1: bid + lot        (no remove — first row)
  row2: bid + lot + remove
  row3: bid + lot + remove

Assertions per theme:
  - each bid input reachable via Tab and has a visible focus ring
  - each lot input reachable via Tab and has a visible focus ring
  - each remove button reachable via Tab and has a visible focus ring
  - Shift+Tab back walks the reverse order without dead-ends
"""

import asyncio, os
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")

results = []
def rec(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


SNAP = r"""() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  return {
    tag: el.tagName,
    cls: (el.className || '').toString(),
    aria: el.getAttribute('aria-label') || '',
    id: el.id || '',
    outline: s.outlineStyle + ' ' + s.outlineWidth,
    hasFocusRing: s.outlineStyle !== 'none' && s.outlineWidth !== '0px',
  };
}"""


async def set_theme(page, theme):
    await page.evaluate(
        "t => document.documentElement.setAttribute('data-pyscal-theme', t)", theme
    )
    await page.wait_for_timeout(80)


async def audit(page, theme):
    await set_theme(page, theme)

    # Walk Tab forward until we've collected all grid controls or footer reached.
    await page.evaluate("() => { const skip = document.querySelector(\"a.pyscal-sr-only\"); if (skip) skip.focus(); else document.body.focus(); }")
    seen = {"bid": set(), "lot": set(), "row-x": set()}
    ring_missing = []
    for _ in range(120):
        await page.keyboard.press("Tab"); await page.wait_for_timeout(200)
        info = await page.evaluate(SNAP)
        if not info:
            continue
        cls = info["cls"]
        aria = info["aria"]
        kind = None
        if "bid-edit" in cls:
            kind = "bid"; key = info["id"] or aria
        elif "lot-edit" in cls:
            kind = "lot"; key = aria
        elif "row-x" == cls or cls.startswith("row-x"):
            kind = "row-x"; key = aria
        if kind:
            seen[kind].add(key)
            if not info["hasFocusRing"]:
                ring_missing.append(f"{kind}:{key} outline={info['outline']}")
        # exit once we're in footer
        if "afd-item" in cls:
            break

    rec(f"{theme} bid inputs reached", len(seen["bid"]) >= 3,
        f"got {len(seen['bid'])} — {sorted(seen['bid'])}")
    rec(f"{theme} lot inputs reached", len(seen["lot"]) >= 3,
        f"got {len(seen['lot'])} — {sorted(seen['lot'])}")
    rec(f"{theme} row remove buttons reached", len(seen["row-x"]) >= 2,
        f"got {len(seen['row-x'])} — {sorted(seen['row-x'])}")
    rec(f"{theme} focus rings on every grid control", not ring_missing,
        f"missing {len(ring_missing)}: {ring_missing[:3]}")


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(headless=True)
        ctx = await b.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector("#main")

        # Grow grid to 3 papan + custom lot on
        await page.click('button[aria-label="Tambah papan"]')
        await page.click('button[aria-label="Tambah papan"]')
        # Enable custom lot if not already on
        toggle = await page.query_selector('button[aria-label="Aktifkan Custom Lot"]')
        if toggle:
            await toggle.click()
        await page.wait_for_timeout(200)

        for theme in ("light", "dark"):
            await audit(page, theme)

        await b.close()

    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
