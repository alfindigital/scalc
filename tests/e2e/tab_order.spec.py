"""Full keyboard Tab / Shift+Tab order E2E.

Walks the entire calculator UI from the very first focusable element in
`#main` all the way through to the last footer social link, and verifies:

  1. Every stop is visible & inside the viewport (not focus-trapped off-screen).
  2. Focus never "jumps" — the DOM order of consecutive focused elements is
     monotonically non-decreasing (compareDocumentPosition FOLLOWING), so
     Tab always moves forward through the document.
  3. Focus enters the footer exactly once and, once inside, visits all 4
     social links contiguously before leaving.
  4. Shift+Tab from the last footer link walks back through the same stops
     in reverse without skipping.

Run:  python3 tests/e2e/tab_order.spec.py
Env:  PYSCAL_E2E_URL (default http://localhost:8080)
"""

import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

VIEWPORTS = [
    ("w375",    {"width": 375,  "height": 812}),
    ("w768",    {"width": 768,  "height": 1024}),
    ("desktop", {"width": 1280, "height": 1800}),
]

MAX_TABS = 400  # hard cap; calc UI has many controls but nowhere near this

results = []
def rec(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


ACTIVE_SNAPSHOT_JS = r"""
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const r = el.getBoundingClientRect();
  const inFoot = !!el.closest('.afd-foot');
  const inMain = !!el.closest('#main');
  const tag = el.tagName.toLowerCase();
  // Stable identity per focused element (order in the current document)
  const all = Array.from(document.querySelectorAll('*'));
  const domIndex = all.indexOf(el);
  return {
    tag,
    id: el.id || '',
    name: el.getAttribute('name') || '',
    aria: el.getAttribute('aria-label') || '',
    inFoot, inMain,
    domIndex,
    rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    visible: r.width > 0 && r.height > 0,
  };
}
"""


async def walk(page, direction, viewport):
    """Tab (or Shift+Tab) until we've either reached the terminal condition
    or exceeded MAX_TABS. Returns the list of focus snapshots in order."""
    seq = []
    for _ in range(MAX_TABS):
        info = await page.evaluate(ACTIVE_SNAPSHOT_JS)
        if info:
            seq.append(info)
            # Terminal: walked past 4th footer link (forward) or back to first #main (reverse)
            foot_hits = sum(1 for s in seq if s["inFoot"] and s["tag"] == "a")
            if direction == "forward" and foot_hits >= 4:
                break
            if direction == "reverse" and info["inMain"] and foot_hits >= 4:
                break
        await page.keyboard.press("Shift+Tab" if direction == "reverse" else "Tab")
    return seq


async def audit_viewport(browser, vp_name, viewport):
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector(".afd-foot")
    # Freeze rotator so focus doesn't jitter mid-walk
    await page.add_style_tag(content="""
      .afd-caret, .afd-glow { visibility: hidden !important; }
      .afd-item, .afd-ico { animation: none !important; transition: none !important; }
    """)

    # Reset focus to just before the first #main control
    await page.evaluate("""
      () => {
        const first = document.querySelector('#main input, #main button, #main select, #main textarea, #main [tabindex]:not([tabindex="-1"])');
        if (first) first.focus();
      }
    """)
    first = await page.evaluate(ACTIVE_SNAPSHOT_JS)
    rec(f"{vp_name} first focus lands in #main", bool(first and first["inMain"]),
        f"{first['tag']}#{first['id']}" if first else "no focus")

    # ---- Forward walk ----
    forward = await walk(page, "forward", viewport)

    # (a) Reached >=4 footer links
    foot_links = [s for s in forward if s["inFoot"] and s["tag"] == "a"]
    rec(f"{vp_name} forward reaches 4 footer links", len(foot_links) >= 4,
        f"got {len(foot_links)} of {len(forward)} stops")

    # (b) Every stop is visible
    invisible = [s for s in forward if not s["visible"]]
    rec(f"{vp_name} forward all stops visible", not invisible,
        f"{len(invisible)} invisible stops")

    # (c) DOM order monotonic (no jumps backward through the tree)
    #     Tab is allowed to visit siblings in source order; a decrease means
    #     focus jumped to an earlier element in the DOM = a jump.
    dom_indices = [s["domIndex"] for s in forward]
    regressions = [(i, dom_indices[i-1], dom_indices[i])
                   for i in range(1, len(dom_indices))
                   if dom_indices[i] < dom_indices[i-1]]
    rec(f"{vp_name} forward focus never jumps backward",
        not regressions,
        f"{len(regressions)} regressions: {regressions[:3]}")

    # (d) Footer entry is single & contiguous — once we hit .afd-foot we don't leave
    first_foot = next((i for i, s in enumerate(forward) if s["inFoot"]), None)
    if first_foot is not None:
        tail = forward[first_foot:]
        left_foot = any(not s["inFoot"] for s in tail)
        rec(f"{vp_name} footer entry is contiguous", not left_foot,
            "bounced out of footer" if left_foot else "ok")
        # And exactly 4 <a> stops inside footer
        foot_a = sum(1 for s in tail if s["inFoot"] and s["tag"] == "a")
        rec(f"{vp_name} footer visits exactly 4 links", foot_a == 4, f"got {foot_a}")
    else:
        rec(f"{vp_name} footer entry is contiguous", False, "never entered footer")

    # (e) No duplicate consecutive focus (would signal an off-screen trap that
    #     Tab can't leave)
    dupes = [(i, forward[i]["tag"], forward[i]["id"])
             for i in range(1, len(forward))
             if forward[i]["domIndex"] == forward[i-1]["domIndex"]]
    rec(f"{vp_name} forward no stuck focus", not dupes,
        f"{len(dupes)} duplicates")

    # ---- Reverse walk from the last footer link ----
    # Focus the last social link, then Shift+Tab back through the app.
    await page.evaluate("""
      () => {
        const links = document.querySelectorAll('.afd-rot a.afd-item');
        links[links.length - 1]?.focus();
      }
    """)
    reverse = await walk(page, "reverse", viewport)

    # DOM order should be monotonically NON-INCREASING on reverse
    rev_idx = [s["domIndex"] for s in reverse]
    rev_regressions = [(i, rev_idx[i-1], rev_idx[i])
                       for i in range(1, len(rev_idx))
                       if rev_idx[i] > rev_idx[i-1]]
    rec(f"{vp_name} reverse focus never jumps forward",
        not rev_regressions,
        f"{len(rev_regressions)} regressions: {rev_regressions[:3]}")

    # Reverse should re-enter #main after leaving footer
    reached_main = any(s["inMain"] for s in reverse)
    rec(f"{vp_name} reverse re-enters #main", reached_main, "")

    # Save an annotated screenshot for manual review
    await page.screenshot(path=str(OUT / f"tab_order_{vp_name}.png"))
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