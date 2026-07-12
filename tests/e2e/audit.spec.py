"""Comprehensive footer + a11y E2E audit.

Covers:
  1. Visual regression snapshots (footer + social icons) across viewports & themes
  2. Focus outline contrast (WCAG AA) in dark mode across viewports
  3. No overflow/clipping of social handles in packed footer, light + dark
  4. Keyboard Tab order flows logically from calculator into footer social buttons

Run manually:
  python3 tests/e2e/audit.spec.py

Env:
  PYSCAL_E2E_URL   default http://localhost:8080
  UPDATE_SNAPSHOTS 1 to (re)write baseline PNGs
"""

import asyncio, os, math
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright

BASE = os.environ.get("PYSCAL_E2E_URL", "http://localhost:8080")
UPDATE = os.environ.get("UPDATE_SNAPSHOTS") == "1"
ROOT = Path(__file__).parent
SNAP = ROOT / "snapshots"
DIFF = ROOT / "screenshots"
SNAP.mkdir(exist_ok=True)
DIFF.mkdir(exist_ok=True)

VIEWPORTS = [
    ("w320",      {"width": 320, "height": 720}),
    ("w375",      {"width": 375, "height": 812}),
    ("w425",      {"width": 425, "height": 800}),
    ("w768",      {"width": 768, "height": 1024}),
    ("landscape", {"width": 812, "height": 375}),
    ("desktop",   {"width": 1280, "height": 900}),
]

results = []
def rec(name, ok, detail=""):
    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {name}" + (f" — {detail}" if detail else ""))
    results.append((name, ok, detail))


# ---------- helpers ----------

def srgb_to_lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def luminance(rgb):
    r, g, b = [srgb_to_lin(x) for x in rgb[:3]]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def parse_rgb(css):
    # "rgb(255, 255, 255)" or "rgba(...)"
    nums = [int(float(x)) for x in css.replace("rgba(", "").replace("rgb(", "").rstrip(")").split(",")[:3]]
    return tuple(nums)


async def snapshot(page, selector, name):
    """Take an element screenshot, compare to baseline PNG. Fail if pixel-diff > 1%."""
    loc = page.locator(selector).first
    await loc.scroll_into_view_if_needed()
    await page.wait_for_timeout(120)
    cur = SNAP / f"{name}.png"
    tmp = DIFF / f"{name}.current.png"
    await loc.screenshot(path=str(tmp))
    if UPDATE or not cur.exists():
        Image.open(tmp).save(cur)
        rec(f"snapshot {name}", True, "baseline written")
        return
    a = Image.open(cur).convert("RGB")
    b = Image.open(tmp).convert("RGB")
    if a.size != b.size:
        rec(f"snapshot {name}", False, f"size {a.size} vs {b.size}")
        return
    diff = ImageChops.difference(a, b)
    bbox = diff.getbbox()
    if not bbox:
        rec(f"snapshot {name}", True, "identical")
        return
    # % of pixels differing beyond small threshold
    hist = diff.crop(bbox).convert("L").getdata()
    changed = sum(1 for p in hist if p > 8)
    total = a.size[0] * a.size[1]
    pct = 100 * changed / total
    ok = pct < 1.0
    rec(f"snapshot {name}", ok, f"{pct:.2f}% pixels changed")


async def set_theme(page, theme):
    if theme == "dark":
        await page.evaluate("document.documentElement.setAttribute('data-pyscal-theme','dark')")
    else:
        await page.evaluate("document.documentElement.removeAttribute('data-pyscal-theme')")
    await page.wait_for_timeout(80)


async def freeze_footer(page):
    """Force social rotator to a deterministic state for stable snapshots:
    disable animations, pin the first social link as .active, hide the blinking caret."""
    await page.add_style_tag(content="""
      .afd-caret, .afd-glow { visibility: hidden !important; }
      .afd-item, .afd-ico, .afd-ico::after { animation: none !important; transition: none !important; }
    """)
    await page.evaluate("""
      () => {
        const items = document.querySelectorAll('.afd-rot a.afd-item');
        items.forEach((el, i) => el.classList.toggle('active', i === 0));
      }
    """)
    await page.wait_for_timeout(80)


async def audit_viewport(browser, vp_name, viewport):
    ctx = await browser.new_context(viewport=viewport, has_touch=viewport["width"] < 768)
    page = await ctx.new_page()
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.wait_for_selector(".afd-foot")
    await page.evaluate("document.querySelector('.afd-foot')?.scrollIntoView()")
    await page.wait_for_timeout(150)

    for theme in ("light", "dark"):
        await set_theme(page, theme)
        await freeze_footer(page)

        # (1) Visual regression snapshot for footer & first icon
        await snapshot(page, ".afd-foot", f"footer_{vp_name}_{theme}")

        # (3) No overflow of handle text — verify each link fits inside footer bbox
        foot_box = await page.locator(".afd-foot").bounding_box()
        links = page.locator(".afd-rot a.afd-item")
        n = await links.count()
        overflow = []
        for i in range(n):
            box = await links.nth(i).bounding_box()
            if not box:
                continue
            # Only require the active/visible link to fit; hidden ones stack absolutely
            is_active = await links.nth(i).evaluate("el => el.classList.contains('active')")
            if not is_active:
                continue
            right_ok = box["x"] + box["width"] <= foot_box["x"] + foot_box["width"] + 1
            left_ok = box["x"] >= foot_box["x"] - 1
            top_ok = box["y"] >= foot_box["y"] - 1
            bot_ok = box["y"] + box["height"] <= foot_box["y"] + foot_box["height"] + 1
            if not (right_ok and left_ok and top_ok and bot_ok):
                overflow.append(i)
            # Also check the handle <b> is not clipped by ellipsis
            clipped = await links.nth(i).evaluate("""
              el => {
                const b = el.querySelector('b');
                if (!b || getComputedStyle(b).display === 'none') return false;
                return b.scrollWidth > b.clientWidth + 1;
              }
            """)
            if clipped:
                overflow.append(f"{i}-clipped")
        rec(f"{vp_name}/{theme} no overflow", not overflow, str(overflow) if overflow else "ok")

        # (2) Focus outline visible + contrast against footer background
        await page.evaluate("document.querySelector('.afd-rot a.afd-item')?.focus()")
        await page.wait_for_timeout(60)
        info = await page.evaluate("""
          () => {
            const el = document.activeElement;
            const s = getComputedStyle(el);
            const bg = getComputedStyle(document.querySelector('.afd-foot')).backgroundColor;
            // Normalize any CSS color (rgb, lab, oklch, color-mix) to rgb via canvas
            const norm = (c) => {
              const cvs = document.createElement('canvas');
              cvs.width = cvs.height = 1;
              const ctx = cvs.getContext('2d');
              ctx.fillStyle = '#000';
              ctx.fillStyle = c;
              ctx.fillRect(0,0,1,1);
              const [r,g,b] = ctx.getImageData(0,0,1,1).data;
              return `rgb(${r}, ${g}, ${b})`;
            };
            return {
              style: s.outlineStyle, width: s.outlineWidth,
              color: norm(s.outlineColor), bg: norm(bg)
            };
          }
        """)
        visible = info["style"] != "none" and info["width"] not in ("0px", "")
        try:
            ratio = contrast(parse_rgb(info["color"]), parse_rgb(info["bg"]))
        except Exception:
            ratio = 0
        # WCAG AA non-text: 3:1
        rec(f"{vp_name}/{theme} focus outline visible", visible, f"{info['width']} {info['style']}")
        rec(f"{vp_name}/{theme} focus contrast >=3:1", ratio >= 3.0, f"ratio={ratio:.2f} outline={info['color']} bg={info['bg']}")

    # (4) Keyboard Tab order: from a calculator control to the footer social links, no wild jumps.
    await set_theme(page, "light")
    # Focus a known early calculator control (skip link or first input)
    await page.evaluate("(document.querySelector('#main input, #main button, #main [tabindex]') )?.focus()")
    order = []
    seen_social = 0
    for _ in range(80):
        info = await page.evaluate("""
          () => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const inFoot = !!el.closest('.afd-foot');
            const inMain = !!el.closest('#main');
            return {
              tag: el.tagName.toLowerCase(),
              cls: el.className && el.className.toString ? el.className.toString().slice(0,60) : '',
              inFoot, inMain,
              aria: el.getAttribute('aria-label') || ''
            };
          }
        """)
        if info:
            order.append(info)
            if info["inFoot"] and info["tag"] == "a":
                seen_social += 1
                if seen_social >= 4:
                    break
        await page.keyboard.press("Tab")

    # Logical order: once we enter footer social links, we should visit >=4 of them contiguously
    social_indices = [i for i, o in enumerate(order) if o["inFoot"] and o["tag"] == "a"]
    contiguous = len(social_indices) >= 4 and (social_indices[-1] - social_indices[0]) == len(social_indices) - 1
    # And we should not bounce back to #main after entering footer
    if social_indices:
        after = order[social_indices[0]:]
        no_bounce = all(not (o["inMain"] and o["tag"] != "a") for o in after)
    else:
        no_bounce = False
    rec(f"{vp_name} tab reaches 4 social links", len(social_indices) >= 4, f"got {len(social_indices)}")
    rec(f"{vp_name} tab order contiguous social", contiguous, str(social_indices))
    rec(f"{vp_name} tab no bounce back to main", no_bounce, "")

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
