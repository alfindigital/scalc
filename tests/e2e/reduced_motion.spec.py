"""Verify prefers-reduced-motion: rotator paused, all items visible, no animations, snapshots stable."""
import asyncio, hashlib, os
from pathlib import Path
from playwright.async_api import async_playwright

ENGINE = os.environ.get("PYSCAL_E2E_BROWSER", "chromium")
OUT = Path(__file__).parent / "screenshots" / ENGINE
OUT.mkdir(parents=True, exist_ok=True)

async def check(page, theme):
    # force theme
    await page.evaluate(f"document.documentElement.dataset.pyscalTheme = '{theme}'")
    footer = page.locator("footer.afd-foot")
    await footer.wait_for(state="visible")
    items = footer.locator(".afd-item")
    n = await items.count()
    assert n == 4, f"expected 4 items got {n}"

    # all visible (opacity 1)
    visible = 0
    for i in range(n):
        op = await items.nth(i).evaluate("el => getComputedStyle(el).opacity")
        if float(op) > 0.9:
            visible += 1
    assert visible == 4, f"[{theme}] reduced-motion: expected all 4 items visible, got {visible}"

    # caret animation none
    caret_anim = await footer.locator(".afd-caret").evaluate("el => getComputedStyle(el).animationName")
    assert caret_anim == "none", f"[{theme}] caret animation should be none, got {caret_anim}"

    # glow hidden
    glow_display = await footer.locator(".afd-glow").evaluate("el => getComputedStyle(el).display")
    assert glow_display == "none", f"[{theme}] glow should be hidden, got {glow_display}"

    # item transition none
    trans = await items.first.evaluate("el => getComputedStyle(el).transitionDuration")
    assert trans in ("0s", "0s, 0s"), f"[{theme}] item transition should be 0s, got {trans}"

    # snapshot stability: two shots taken after 500ms delay should match
    p1 = OUT / f"reduced_motion_{theme}_a.png"
    p2 = OUT / f"reduced_motion_{theme}_b.png"
    await footer.screenshot(path=str(p1))
    await page.wait_for_timeout(1500)
    await footer.screenshot(path=str(p2))
    h1 = hashlib.sha256(p1.read_bytes()).hexdigest()
    h2 = hashlib.sha256(p2.read_bytes()).hexdigest()
    assert h1 == h2, f"[{theme}] snapshot changed between captures (rotator not paused)"
    print(f"OK [{theme}] 4 items visible, no animations, snapshot stable")

async def main():
    async with async_playwright() as pw:
        bt = getattr(pw, ENGINE)
        browser = await bt.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            reduced_motion="reduce",
        )
        page = await context.new_page()
        await page.goto("http://localhost:8080/", wait_until="domcontentloaded")
        await page.wait_for_selector("footer.afd-foot")
        for theme in ("light", "dark"):
            await check(page, theme)
        await browser.close()
    print(f"PASS ({ENGINE})")

asyncio.run(main())
