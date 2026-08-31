"""Accessibility regression test for the InfoModal.

Covers:
  - opening via the header info (i) icon
  - dialog semantics (role/aria-modal/aria-labelledby)
  - initial focus on the close button
  - Tab / Shift+Tab focus trap stays inside the dialog
  - Escape closes and restores focus to the trigger
  - close button closes and restores focus
  - activating the FAQ link navigates to /faq
  - axe audit of the open dialog (light + dark)
"""

import asyncio, os
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
AXE = Path("node_modules/axe-core/axe.min.js").read_text()
TRIGGER = '[aria-label="Info: cara pakai PYSCAL"]'

RULES = [
    "color-contrast", "button-name", "link-name", "aria-allowed-attr",
    "aria-required-attr", "aria-valid-attr", "aria-valid-attr-value",
    "aria-roles", "aria-hidden-focus", "label", "duplicate-id-aria",
]

results = []
def rec(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


async def open_modal(page):
    await page.click(TRIGGER)
    await page.wait_for_selector('[role="dialog"][aria-modal="true"]')


async def active_info(page):
    return await page.evaluate(
        """() => {
            const el = document.activeElement;
            if (!el) return null;
            return {
              tag: el.tagName,
              label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 40),
              inDialog: !!el.closest('[role="dialog"]'),
            };
        }"""
    )


async def run(page):
    # --- open + semantics -------------------------------------------------
    await open_modal(page)
    sem = await page.evaluate(
        """() => {
            const d = document.querySelector('[role="dialog"]');
            const id = d.getAttribute('aria-labelledby');
            return { labelled: !!(id && document.getElementById(id)),
                     modal: d.getAttribute('aria-modal') };
        }"""
    )
    rec("dialog has aria-modal + resolvable aria-labelledby",
        sem["labelled"] and sem["modal"] == "true", str(sem))

    # --- initial focus ----------------------------------------------------
    first = await active_info(page)
    rec("initial focus is inside dialog on close button",
        bool(first and first["inDialog"] and first["tag"] == "BUTTON"), str(first))

    # --- forward focus trap ----------------------------------------------
    escaped = None
    for _ in range(12):
        await page.keyboard.press("Tab")
        info = await active_info(page)
        if not info or not info["inDialog"]:
            escaped = info
            break
    rec("Tab focus trap keeps focus inside dialog", escaped is None, str(escaped))

    # --- backward focus trap ---------------------------------------------
    escaped = None
    for _ in range(12):
        await page.keyboard.press("Shift+Tab")
        info = await active_info(page)
        if not info or not info["inDialog"]:
            escaped = info
            break
    rec("Shift+Tab focus trap keeps focus inside dialog", escaped is None, str(escaped))

    # --- Escape closes + restores focus ----------------------------------
    await page.keyboard.press("Escape")
    await page.wait_for_selector('[role="dialog"]', state="detached")
    restored = await page.evaluate(
        "(sel) => document.activeElement === document.querySelector(sel)", TRIGGER
    )
    rec("Escape closes dialog and restores focus to trigger", restored)

    # --- close button closes + restores focus ----------------------------
    await open_modal(page)
    await page.click('[role="dialog"] .modal-close')
    await page.wait_for_selector('[role="dialog"]', state="detached")
    restored = await page.evaluate(
        "(sel) => document.activeElement === document.querySelector(sel)", TRIGGER
    )
    rec("Close button closes dialog and restores focus to trigger", restored)

    # --- axe audit of open dialog, both themes ---------------------------
    for theme in ("light", "dark"):
        await page.evaluate(
            "(t) => document.documentElement.setAttribute('data-pyscal-theme', t)", theme
        )
        await open_modal(page)
        await page.add_script_tag(content=AXE)
        res = await page.evaluate(
            """async (rules) => await axe.run(document.querySelector('[role="dialog"]'), {
                 runOnly: { type: 'rule', values: rules },
                 resultTypes: ['violations'],
               })""",
            RULES,
        )
        viols = res.get("violations", [])
        rec(f"axe clean/{theme}", not viols,
            "; ".join(f"{v['id']}[{v['impact']}] " + " ".join(str(n['target']) + '=>' + n.get('failureSummary','').replace(chr(10),' ')[:200] for n in v['nodes']) for v in viols))
        await page.keyboard.press("Escape")
        await page.wait_for_selector('[role="dialog"]', state="detached")

    # --- FAQ link activation via keyboard --------------------------------
    await open_modal(page)
    link = page.locator('[role="dialog"] a[href="/faq"]')
    rec("FAQ link present with accessible name",
        await link.count() == 1 and bool((await link.first.get_attribute("aria-label"))
                                         or (await link.first.inner_text()).strip()))
    await link.first.focus()
    await page.keyboard.press("Enter")
    await page.wait_for_url("**/faq", timeout=10000)
    heading = await page.locator("h1").first.inner_text()
    rec("FAQ link navigates to /faq", page.url.rstrip("/").endswith("/faq"),
        f"{page.url} — h1: {heading}")
    rec("dialog closed after navigation",
        await page.locator('[role="dialog"]').count() == 0)

    # --- click the header info icon from /faq back home -------------------
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.click(TRIGGER)
    await page.wait_for_selector('[role="dialog"]')
    await page.click('[role="dialog"] a[href="/faq"]')
    await page.wait_for_url("**/faq", timeout=10000)
    rec("mouse: info icon -> FAQ link opens /faq", page.url.rstrip("/").endswith("/faq"), page.url)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_selector(TRIGGER)
        await run(page)
        await browser.close()

    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
