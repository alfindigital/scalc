"""Automated a11y audit using axe-core.

Injects `node_modules/axe-core/axe.min.js` into the running app and runs
axe against:
  - The calculator (#main)
  - The footer social buttons (.afd-foot)
in both light and dark themes.

Rules audited (WCAG 2.1 AA scope):
  color-contrast, aria-*, button-name, link-name, label,
  role-* , focus-order-semantics.

Fails on any `violations` returned by axe. Prints the rule id, impact,
and a short target snippet per violation so it's actionable.
"""

import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
AXE = Path("node_modules/axe-core/axe.min.js").read_text()
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)

RULES = [
    "color-contrast",
    "button-name",
    "link-name",
    "aria-allowed-attr",
    "aria-required-attr",
    "aria-valid-attr",
    "aria-valid-attr-value",
    "aria-roles",
    "aria-hidden-focus",
    "label",
    "duplicate-id-aria",
    "focus-order-semantics",
]

SCOPES = [
    ("calculator", "#main"),
    ("footer",     ".afd-foot"),
]

results = []
def rec(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


async def set_theme(page, theme):
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-pyscal-theme','dark')")
    else:
        await page.evaluate("document.documentElement.setAttribute('data-pyscal-theme','light')")
    await page.wait_for_timeout(120)


async def run_axe(page, selector):
    return await page.evaluate(
        """async ({ selector, rules }) => {
            const target = document.querySelector(selector);
            if (!target) return { error: 'selector not found: ' + selector };
            return await axe.run(target, {
              runOnly: { type: 'rule', values: rules },
              resultTypes: ['violations'],
            });
        }""",
        {"selector": selector, "rules": RULES},
    )


async def audit(page, theme, label, selector):
    await set_theme(page, theme)
    # Freeze footer rotator so hidden inactive links don't confuse axe (they
    # are pointer-events:none but still in the tab order — that is a
    # deliberate rotator design, tested elsewhere).
    await page.add_style_tag(content="""
      .afd-item, .afd-ico { animation: none !important; transition: none !important; }
      .afd-caret, .afd-glow { visibility: hidden !important; }
    """)
    res = await run_axe(page, selector)
    if "error" in res:
        rec(f"{label}/{theme}", False, res["error"])
        return
    viols = res.get("violations", [])
    if not viols:
        rec(f"{label}/{theme} axe clean", True, f"{len(RULES)} rules checked")
        return
    # Report each violation compactly
    detail = []
    for v in viols:
        nodes = v.get("nodes", [])
        targets = [n.get("target", [""])[0] for n in nodes[:3]]
        detail.append(f"{v['id']}[{v['impact']}]:{','.join(targets)}")
    rec(f"{label}/{theme} axe clean", False, "; ".join(detail))
    # Full report to disk for debugging
    (OUT / f"axe_{label}_{theme}.json").write_text(json.dumps(viols, indent=2))


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector(".afd-foot")
        await page.add_script_tag(content=AXE)

        for theme in ("light", "dark"):
            for label, sel in SCOPES:
                await audit(page, theme, label, sel)

        # Also verify each social link + gear button + a calculator control
        # have an accessible focus indicator when reached via keyboard Tab
        # navigation (not programmatic .focus()). This exercises the real
        # :focus-visible path a keyboard user experiences. We accept a
        # visible outline, box-shadow, or border-color change vs resting.
        async def tab_until(selector, max_tabs=200):
            """Press Tab (and Shift+Tab as fallback) until the element matching
            `selector` becomes document.activeElement. Returns True on match."""
            # Start from a known anchor before the target so Tab order is
            # deterministic across runs.
            await page.evaluate("() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); }")
            await page.evaluate("() => document.body.focus()")
            for _ in range(max_tabs):
                await page.keyboard.press("Tab")
                matched = await page.evaluate(
                    "(sel) => { const t = document.querySelector(sel); return !!t && document.activeElement === t; }",
                    selector,
                )
                if matched:
                    return True
            return False

        for theme in ("light", "dark"):
            await set_theme(page, theme)
            for sel, label in [
                ('#main button, #main input, #main [tabindex]:not([tabindex="-1"])', "calc"),
                (".afd-rot a.afd-item", "social"),
                ('[aria-label="Buka Settings"]', "gear"),
            ]:
                # Resolve the first matching element for resting-style capture.
                el = await page.query_selector(sel)
                if not el:
                    rec(f"{label}/{theme} focus-visible via Tab", False, "target not found")
                    continue
                resting = await page.evaluate(
                    "(el) => { const s = getComputedStyle(el); return { outline: s.outline, borderColor: s.borderColor, boxShadow: s.boxShadow }; }",
                    el,
                )
                # Build a concrete selector that Tab navigation can match
                # against document.activeElement. For the composite calc
                # selector, target the first matching element by id/tag.
                concrete_sel = await page.evaluate(
                    """(sel) => {
                        const el = document.querySelector(sel);
                        if (!el) return null;
                        if (el.id) return '#' + CSS.escape(el.id);
                        // Fall back to the original selector — activeElement
                        // check uses strict equality against querySelector.
                        return sel;
                    }""",
                    sel,
                )
                reached = await tab_until(concrete_sel or sel)
                if not reached:
                    rec(f"{label}/{theme} focus-visible via Tab", False, "Tab never landed on target")
                    continue
                focused = await page.evaluate(
                    "() => { const s = getComputedStyle(document.activeElement); return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, borderColor: s.borderColor, boxShadow: s.boxShadow }; }"
                )
                hasOutline = focused["outlineStyle"] != "none" and focused["outlineWidth"] not in ("0px", "")
                hasShadow = focused["boxShadow"] not in ("none", "0px 0px 0px 0px", "")
                borderChanged = focused["borderColor"] != resting["borderColor"]
                ok = hasOutline or hasShadow or borderChanged
                rec(f"{label}/{theme} focus-visible via Tab", ok,
                    f"outline {focused['outlineStyle']} {focused['outlineWidth']}, shadow {focused['boxShadow']}")

        await browser.close()

    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())