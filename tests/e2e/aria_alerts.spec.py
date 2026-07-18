"""E2E: verify aria-invalid / aria-describedby / role=alert wiring for
   (a) bid-rise warning and (b) format error, on mobile + desktop viewports.

Run: python3 tests/e2e/aria_alerts.spec.py
Env: PYSCAL_E2E_URL (default http://localhost:8080)
"""
import asyncio, os, re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
OUT = Path(__file__).parent / "screenshots"; OUT.mkdir(exist_ok=True)

VIEWPORTS = [("mobile", {"width": 390, "height": 844}),
             ("desktop", {"width": 1280, "height": 900})]

results = []
def rec(name, ok, detail=""):
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


async def assert_wired(page, input_locator, label, expect_invalid, text_re):
    """Assert aria-invalid, aria-describedby resolves to a role=alert
    element whose text matches text_re."""
    handle = await input_locator.element_handle()
    if not handle:
        rec(f"{label} input present", False, "no handle"); return
    info = await page.evaluate("""(el) => {
        const describedBy = el.getAttribute('aria-describedby');
        const invalid = el.getAttribute('aria-invalid');
        let desc = null, role = null, text = null, live = null;
        if (describedBy) {
            desc = document.getElementById(describedBy);
            if (desc) { role = desc.getAttribute('role');
                        text = (desc.textContent || '').trim();
                        live = desc.getAttribute('aria-live'); }
        }
        return { invalid, describedBy, role, text, live };
    }""", handle)
    rec(f"{label} aria-invalid={expect_invalid}",
        (info["invalid"] == "true") == expect_invalid,
        f"got aria-invalid={info['invalid']}")
    rec(f"{label} aria-describedby resolves",
        bool(info["describedBy"]) and info["role"] == "alert",
        f"id={info['describedBy']} role={info['role']}")
    rec(f"{label} alert text matches /{text_re.pattern}/",
        bool(info["text"]) and bool(text_re.search(info["text"] or "")),
        f"text={info['text']!r}")
    rec(f"{label} aria-live set",
        info["live"] in ("assertive", "polite"),
        f"aria-live={info['live']}")


async def audit(browser, vp_name, viewport):
    ctx = await browser.new_context(viewport=viewport)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector("#main")
    # dismiss onboarding if shown
    await page.evaluate("() => { try { localStorage.setItem('pyscal_onboarded','1'); } catch {} }")
    await page.reload(wait_until="domcontentloaded")
    await page.wait_for_selector("#main")

    # --- Scenario A: format error on Bid Awal (non-integer) ---
    bid_awal = page.get_by_label(re.compile(r"^Bid Awal", re.I)).first
    await bid_awal.click()
    await bid_awal.fill("1.5")
    await page.wait_for_timeout(150)
    await assert_wired(page, bid_awal, f"{vp_name}/format-error bid-awal",
                       expect_invalid=True,
                       text_re=re.compile(r"bilangan bulat|integer", re.I))
    # restore
    await bid_awal.fill("1000")
    await page.wait_for_timeout(100)

    # --- Scenario B: bid-rise warning ---
    # add a second papan
    await page.get_by_role("button", name=re.compile(r"^Tambah papan$", re.I)).click()
    await page.wait_for_timeout(200)
    # locate row-2 bid input (label "Bid papan 2")
    bid2 = page.get_by_label(re.compile(r"^Bid papan 2$", re.I)).first
    await bid2.wait_for(state="attached", timeout=3000)
    # force it to be >= papan 1 (1000) so bidRiseWarnings triggers
    await bid2.fill("1200")
    await page.wait_for_timeout(200)
    await assert_wired(page, bid2, f"{vp_name}/bid-rise papan2",
                       expect_invalid=False,
                       text_re=re.compile(r"averaging down|tidak lebih rendah", re.I))

    await page.screenshot(path=str(OUT / f"aria_alerts_{vp_name}.png"))
    await ctx.close()


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for name, vp in VIEWPORTS:
            await audit(browser, name, vp)
        await browser.close()
    fails = [r for r in results if not r[1]]
    print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
    if fails:
        for n, _, d in fails:
            print(f"  FAIL: {n} — {d}")
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())
