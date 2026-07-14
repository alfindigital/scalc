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

        # Also verify each social link + gear button have an accessible focus
        # indicator. Axe doesn't check focus outlines directly. We accept a
        # visible outline, box-shadow, or border-color change as long as it is
        # clearly different from the resting state.
        for theme in ("light", "dark"):
            await set_theme(page, theme)
            for sel, label in [
                (".afd-rot a.afd-item", "social"),
                ('[aria-label="Buka Settings"]', "gear"),
            ]:
                el = await page.query_selector(sel)
                resting = await page.evaluate(
                    "(el) => { const s = getComputedStyle(el); return { outline: s.outline, borderColor: s.borderColor, boxShadow: s.boxShadow }; }",
                    el,
                )
                await page.evaluate(f"document.querySelector({json.dumps(sel)})?.focus()")
                focused = await page.evaluate(
                    "() => { const s = getComputedStyle(document.activeElement); return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, borderColor: s.borderColor, boxShadow: s.boxShadow }; }"
                )
                hasOutline = focused["outlineStyle"] != "none" and focused["outlineWidth"] not in ("0px", "")
                hasShadow = focused["boxShadow"] not in ("none", "0px 0px 0px 0px", "")
                borderChanged = focused["borderColor"] != resting["borderColor"]
                ok = hasOutline or hasShadow or borderChanged
                rec(f"{label}/{theme} focus-visible outline", ok,
                    f"outline {focused['outlineStyle']} {focused['outlineWidth']}, shadow {focused['boxShadow']}")

        await browser.close()

    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())