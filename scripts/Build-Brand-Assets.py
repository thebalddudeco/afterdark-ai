from __future__ import annotations

import io
import math
import os
import random
import shutil
from pathlib import Path

import resvg_py
from PIL import Image
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
WEB = PUBLIC / "brand"
VECTOR = WEB / "vector"
RELEASE = ROOT / "release" / "Shadowframe-Brand-Kit-v2"
RASTER = RELEASE / "raster-4096-plus"
ANIMATION = RELEASE / "animation"
DESKTOP = ROOT / "desktop" / "Shadowframe.Launcher" / "Assets"
FONT_BOLD = Path("C:/Windows/Fonts/seguisb.ttf")
FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")

for folder in (WEB, VECTOR, RELEASE / "vector", RASTER, ANIMATION, DESKTOP):
    folder.mkdir(parents=True, exist_ok=True)


def smooth_path(points: list[tuple[float, float]], tension: float = 1.0) -> str:
    if len(points) < 2:
        return ""
    out = [f"M{points[0][0]:.1f},{points[0][1]:.1f}"]
    pts = [points[0], *points, points[-1]]
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension)
        out.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    return " ".join(out)


def galaxy_markup(phase: float = 0) -> str:
    paths = []
    colors = ("#ff3c00", "#ff6b12", "#ff9b32", "#ffd27a", "#fff3c4")
    for arm in range(7):
        points = []
        for i in range(30):
            t = i / 29
            angle = phase + arm * math.tau / 7 + t * math.tau * 1.45
            radius = 16 + t * 230
            squash = .70 + .08 * math.sin(arm * 1.8)
            points.append((512 + math.cos(angle) * radius, 512 + math.sin(angle) * radius * squash))
        paths.append(
            f'<path d="{smooth_path(points)}" fill="none" stroke="{colors[arm % len(colors)]}" '
            f'stroke-width="{22 - arm * 1.8:.1f}" stroke-linecap="round" opacity="{.88 - arm * .065:.2f}"/>'
        )
    rng = random.Random(240719)
    particles = []
    for _ in range(105):
        a = rng.random() * math.tau + phase
        r = 35 + rng.random() ** .55 * 255
        x, y = 512 + math.cos(a) * r, 512 + math.sin(a) * r * .73
        size = 1.5 + rng.random() * 5
        particles.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{size:.1f}" fill="#ffd58b" opacity="{.3+rng.random()*.65:.2f}"/>')
    return "".join(paths + particles) + '<circle cx="512" cy="512" r="34" fill="#fff8d8" filter="url(#coreGlow)"/>'


def mark_svg(phase: float = 0, background: bool = False) -> str:
    bg = '<rect width="1024" height="1024" rx="220" fill="#08090c"/>' if background else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs>
  <linearGradient id="edge" x1="150" y1="100" x2="860" y2="920" gradientUnits="userSpaceOnUse"><stop stop-color="#f8f5f0"/><stop offset=".2" stop-color="#88909d"/><stop offset=".5" stop-color="#20242b"/><stop offset=".78" stop-color="#ff5a12"/><stop offset="1" stop-color="#501706"/></linearGradient>
  <radialGradient id="depth"><stop stop-color="#3a1409"/><stop offset=".56" stop-color="#120b0a"/><stop offset="1" stop-color="#030407"/></radialGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="11" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="coreGlow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="24" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="crystalClip"><path d="M512 58 798 256 888 651 512 950 136 651 226 256Z"/></clipPath>
</defs>{bg}
<g filter="url(#glow)"><path d="M512 58 798 256 888 651 512 950 136 651 226 256Z" fill="url(#depth)" stroke="url(#edge)" stroke-width="13"/></g>
<g clip-path="url(#crystalClip)">
  <path d="M512 58 512 286 226 256Z" fill="#d9dee7" opacity=".24"/><path d="M512 58 798 256 512 286Z" fill="#747b86" opacity=".28"/>
  <path d="M226 256 512 286 348 633 136 651Z" fill="#56606d" opacity=".18"/><path d="M798 256 512 286 676 633 888 651Z" fill="#f6f8fb" opacity=".15"/>
  <path d="M136 651 348 633 512 950Z" fill="#ff5b12" opacity=".15"/><path d="M888 651 676 633 512 950Z" fill="#bdc5d0" opacity=".13"/>
  <g transform="rotate({math.degrees(phase):.2f} 512 512)" filter="url(#glow)">{galaxy_markup(phase)}</g>
  <path d="M512 286 676 633 512 824 348 633Z" fill="none" stroke="#ff8a3d" stroke-width="5" opacity=".3"/>
</g>
<g fill="none" stroke="#eef1f4" stroke-width="5" opacity=".3"><path d="M512 58 512 286 136 651M512 286 888 651M348 633 512 950 676 633"/></g>
</svg>'''


def text_paths(text: str, x: float, baseline: float, size: float, fill: str, bold: bool = True, spacing: float = 0) -> tuple[str, float]:
    tt = TTFont(str(FONT_BOLD if bold else FONT_REGULAR))
    glyphs, cmap, hmtx = tt.getGlyphSet(), tt.getBestCmap(), tt["hmtx"].metrics
    scale = size / tt["head"].unitsPerEm
    cursor, paths = 0.0, []
    for char in text:
        name = cmap.get(ord(char))
        if not name:
            cursor += size * .4
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            paths.append(f'<path d="{d}" fill="{fill}" transform="translate({x + cursor:.2f} {baseline:.2f}) scale({scale:.6f} {-scale:.6f})"/>')
        cursor += hmtx[name][0] * scale + spacing
    return "".join(paths), cursor


def wordmark_group(x: float, baseline: float, size: float, tagline: bool = True) -> str:
    main, width = text_paths("SHADOWFRAME", x, baseline, size, "#ff5f18", True, size * .025)
    ai, _ = text_paths("AI", x, baseline + size * 1.0, size * .78, "#ff7a2d", True, size * .025)
    tag = ""
    if tagline:
        # Keep the strapline on its own baseline so it remains legible in every
        # lockup and never crosses the outlined SHADOWFRAME lettering.
        tag, _ = text_paths("CREATE IN MOTION", x, baseline + size * 1.72, size * .20, "#f2ece5", False, size * .10)
    return main + ai + tag


def lockup_svg(horizontal: bool = True) -> str:
    if horizontal:
        mark = mark_svg().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">', '<g transform="translate(40 40) scale(.55)">').replace('</svg>', '</g>')
        words = wordmark_group(690, 330, 160, True)
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 700">{mark}{words}</svg>'
    mark = mark_svg().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">', '<g transform="translate(330 40) scale(.92)">').replace('</svg>', '</g>')
    words = wordmark_group(170, 1240, 180, False)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1700">{mark}{words}</svg>'


def rune_pattern() -> str:
    rng = random.Random(7284)
    paths = []
    for row in range(16):
        for col in range(20):
            if rng.random() < .28:
                continue
            x, y, s = 90 + col * 196, 100 + row * 242, 46
            segs = []
            for _ in range(rng.randint(2, 5)):
                x1, y1 = x + rng.choice((0, s/2, s)), y + rng.choice((0, s/2, s))
                x2, y2 = x + rng.choice((0, s/2, s)), y + rng.choice((0, s/2, s))
                segs.append(f'M{x1:.0f},{y1:.0f}L{x2:.0f},{y2:.0f}')
            paths.append(f'<path d="{"".join(segs)}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4096 4096"><rect width="4096" height="4096" fill="#08090b"/><g fill="none" stroke="#ff5f18" stroke-width="5" opacity=".38">{"".join(paths)}</g></svg>'


def banner_svg(width: int = 4000, height: int = 1200, social: bool = False) -> str:
    mark_scale = .64 if social else .56
    mark_x, mark_y = (180, 180) if social else (120, 150)
    word_x, word_y, word_size = ((1050, 600, 260) if social else (780, 555, 230))
    mark = mark_svg().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">', f'<g transform="translate({mark_x} {mark_y}) scale({mark_scale})">').replace('</svg>', '</g>')
    words = wordmark_group(word_x, word_y, word_size, True)
    curves = []
    for i in range(13):
        y = 120 + i * height / 12
        curves.append(f'<path d="M{width*.60:.0f},{height:.0f} C{width*.66:.0f},{height*.58:.0f} {width*.78:.0f},{y:.0f} {width:.0f},{y*.72:.0f}" fill="none" stroke="#ff5f18" stroke-width="{3+i*.8:.1f}" opacity="{.08+i*.025:.2f}"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}"><defs><radialGradient id="bg" cx="75%" cy="54%"><stop stop-color="#421506"/><stop offset=".42" stop-color="#130b09"/><stop offset="1" stop-color="#050608"/></radialGradient></defs><rect width="{width}" height="{height}" fill="url(#bg)"/><g>{''.join(curves)}</g>{mark}{words}<rect x="28" y="28" width="{width-56}" height="{height-56}" rx="46" fill="none" stroke="#b24712" stroke-width="4" opacity=".7"/></svg>'''


def save_svg(name: str, svg: str):
    for folder in (VECTOR, RELEASE / "vector"):
        (folder / name).write_text(svg, encoding="utf-8")


def render(svg: str, target: Path, width: int, height: int):
    target.write_bytes(resvg_py.svg_to_bytes(svg_string=svg, width=width, height=height, shape_rendering="geometric_precision"))


mark = mark_svg()
app_icon = mark_svg(background=True)
horizontal = lockup_svg(True)
stacked = lockup_svg(False)
wide = banner_svg()
social = banner_svg(4000, 2100, True)
pattern = rune_pattern()

save_svg("crystal-mark.svg", mark)
save_svg("app-icon.svg", app_icon)
save_svg("logo-horizontal.svg", horizontal)
save_svg("logo-stacked.svg", stacked)
save_svg("banner-wide.svg", wide)
save_svg("social-card.svg", social)
save_svg("rune-pattern.svg", pattern)

render(mark, RASTER / "crystal-mark-transparent-4096.png", 4096, 4096)
render(app_icon, RASTER / "app-icon-4096.png", 4096, 4096)
render(horizontal, RASTER / "logo-horizontal-5000.png", 5000, 1400)
render(stacked, RASTER / "logo-stacked-4096.png", 4096, 4352)
render(wide, RASTER / "banner-wide-6000.png", 6000, 1800)
render(social, RASTER / "social-card-4096.png", 4096, 2150)
render(pattern, RASTER / "rune-pattern-4096.png", 4096, 4096)

if os.environ.get("SHADOWFRAME_SKIP_GIF") != "1" or not (ANIMATION / "crystal-vortex-4096.gif").exists():
    frames = []
    for i in range(8):
        png = resvg_py.svg_to_bytes(svg_string=mark_svg(i * math.tau / 8, True), width=4096, height=4096, shape_rendering="geometric_precision")
        frames.append(Image.open(io.BytesIO(png)).convert("P", palette=Image.Palette.ADAPTIVE, colors=64))
    frames[0].save(ANIMATION / "crystal-vortex-4096.gif", save_all=True, append_images=frames[1:], duration=110, loop=0, optimize=True, disposal=2)

# Web-ready derivatives retain the same vector master.
for name, source in (("logo-mark.svg", mark), ("logo-lockup-light.svg", horizontal), ("logo-lockup-dark.svg", horizontal)):
    (WEB / name).write_text(source, encoding="utf-8")
(PUBLIC / "favicon.svg").write_text(app_icon, encoding="utf-8")
(PUBLIC / "safari-pinned-tab.svg").write_text(mark.replace("#ff5f18", "#000000").replace("#ff6b12", "#000000"), encoding="utf-8")

hi_icon = Image.open(RASTER / "app-icon-4096.png").convert("RGBA")
transparent = Image.open(RASTER / "crystal-mark-transparent-4096.png").convert("RGBA")
hi_social = Image.open(RASTER / "social-card-4096.png").convert("RGB")
hi_banner = Image.open(RASTER / "banner-wide-6000.png").convert("RGB")

def resized(image: Image.Image, size: tuple[int, int], target: Path, quality: int = 95):
    out = image.resize(size, Image.Resampling.LANCZOS)
    if target.suffix.lower() in (".jpg", ".jpeg"):
        out.convert("RGB").save(target, quality=quality, optimize=True)
    else:
        out.save(target, optimize=True)

resized(transparent, (1024, 1024), WEB / "logo-mark-transparent.png")
resized(transparent, (256, 256), WEB / "logo-mark-256.png")
resized(transparent, (64, 64), WEB / "logo-mark-64.png")
resized(hi_icon, (1024, 1024), WEB / "app-icon-1024.png")
for size in (512, 192, 150):
    resized(hi_icon, (size, size), WEB / ({512:"icon-512.png",192:"icon-192.png",150:"mstile-150.png"}[size]))
resized(hi_icon, (512, 512), WEB / "icon-maskable-512.png")
resized(hi_social, (1200, 630), WEB / "social-card.png")
resized(hi_social, (1280, 640), WEB / "github-banner.png")
resized(hi_banner, (1500, 450), WEB / "banner-wide.png")
resized(hi_banner, (1920, 1080), WEB / "hero-background.jpg")
resized(hi_icon, (180, 180), PUBLIC / "apple-touch-icon.png")
resized(hi_icon, (32, 32), PUBLIC / "favicon-32x32.png")
resized(hi_icon, (16, 16), PUBLIC / "favicon-16x16.png")
resized(hi_icon, (256, 256), DESKTOP / "shadowframe.png")
desktop_icon = hi_icon.resize((256, 256), Image.Resampling.LANCZOS)
desktop_icon.save(DESKTOP / "shadowframe.ico", sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])

shutil.copy2(ANIMATION / "crystal-vortex-4096.gif", WEB / "crystal-vortex.gif")
print(f"Created vector masters in {RELEASE / 'vector'}")
print(f"Created 4096px+ exports in {RASTER}")
