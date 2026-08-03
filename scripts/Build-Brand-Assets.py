from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
DESKTOP = ROOT / "desktop" / "Shadowframe.Launcher" / "Assets"
MASTER = BRAND / "master-key-art.png"

BLACK = "#0B0B0D"
ORANGE = "#FF6718"
LIGHT_ORANGE = "#FF9B55"
WHITE = "#F7F3EF"
MUTED = "#A7A7AD"


def font(size: int, bold: bool = False):
    options = [
        Path("C:/Windows/Fonts/seguisb.ttf") if bold else Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for path in options:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def cover(image: Image.Image, size: tuple[int, int], focus_x: float = 0.68) -> Image.Image:
    width, height = size
    scale = max(width / image.width, height / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    overflow_x = resized.width - width
    left = round(max(0, min(overflow_x, overflow_x * focus_x)))
    top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def draw_mark(size: int, transparent: bool = False, safe: float = 0.0) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else (11, 11, 13, 255))
    draw = ImageDraw.Draw(canvas)
    inset = round(size * (0.10 + safe))
    outer = (inset, inset, size - inset, size - inset)
    if transparent:
        draw.rounded_rectangle(outer, radius=round(size * .20), fill=BLACK)
    stroke = max(2, round(size * .052))
    margin = round(size * (.22 + safe * .38))
    arm = round(size * .18)
    color = ORANGE
    lines = [
        ((margin, margin + arm), (margin, margin), (margin + arm, margin)),
        ((size - margin - arm, margin), (size - margin, margin), (size - margin, margin + arm)),
        ((size - margin, size - margin - arm), (size - margin, size - margin), (size - margin - arm, size - margin)),
        ((margin + arm, size - margin), (margin, size - margin), (margin, size - margin - arm)),
    ]
    for points in lines:
        draw.line(points, fill=color, width=stroke, joint="curve")
    sfont = font(round(size * .42), True)
    bbox = draw.textbbox((0, 0), "S", font=sfont)
    tx = (size - (bbox[2] - bbox[0])) // 2
    ty = (size - (bbox[3] - bbox[1])) // 2 - bbox[1] - round(size * .005)
    draw.text((tx, ty), "S", font=sfont, fill=LIGHT_ORANGE)
    dot = max(1, round(size * .018))
    draw.ellipse((size // 2 - dot, size // 2 - dot, size // 2 + dot, size // 2 + dot), fill="#FFE1CC")
    return canvas


def add_wordmark(canvas: Image.Image, x: int, y: int, scale: float, light: bool = True):
    draw = ImageDraw.Draw(canvas)
    title_font = font(round(66 * scale), True)
    ai_font = font(round(66 * scale), False)
    tag_font = font(round(20 * scale), False)
    main = "SHADOWFRAME"
    main_fill = WHITE if light else "#111114"
    draw.text((x, y), main, font=title_font, fill=main_fill)
    width = draw.textbbox((x, y), main, font=title_font)[2] - x
    draw.text((x + width + round(20 * scale), y), "AI", font=ai_font, fill=ORANGE)
    draw.text((x + round(4 * scale), y + round(82 * scale)), "C R E A T E   I N   M O T I O N", font=tag_font, fill=MUTED)


def banner(size: tuple[int, int], filename: str, layout: str = "standard"):
    source = Image.open(MASTER).convert("RGB")
    canvas = cover(source, size)
    w, h = size
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for x in range(round(w * .68)):
        alpha = round(236 * (1 - x / (w * .68)) ** 1.45)
        od.line((x, 0, x, h), fill=(4, 4, 6, alpha))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), overlay)
    if layout == "wide":
        mark_size = round(h * .32)
        mark_x, mark_y = round(w * .055), round(h * .25)
        scale = h / 570
        text_x, text_y = mark_x + mark_size + round(h * .09), round(h * .29)
    else:
        mark_size = round(h * .19)
        mark_x, mark_y = round(w * .07), round(h * .14)
        scale = h / 650
        text_x, text_y = mark_x + mark_size + round(h * .05), round(h * .16)
    canvas.alpha_composite(draw_mark(mark_size, transparent=True), (mark_x, mark_y))
    add_wordmark(canvas, text_x, text_y, scale)
    draw = ImageDraw.Draw(canvas)
    if layout != "wide":
        draw.text((round(w * .075), round(h * .64)), "PRIVATE AI CREATION, POWERED BY YOUR GPU.", font=font(round(h * .032), True), fill=WHITE)
        draw.text((round(w * .075), round(h * .71)), "Images and cinematic motion, created on your terms.", font=font(round(h * .025)), fill=MUTED)
        draw.rounded_rectangle((round(w * .075), round(h * .80), round(w * .25), round(h * .875)), radius=round(h * .02), fill=ORANGE)
        draw.text((round(w * .102), round(h * .817)), "CREATE WITHOUT LIMITS", font=font(round(h * .022), True), fill=WHITE)
    canvas.convert("RGB").save(BRAND / filename, quality=94, optimize=True)


BRAND.mkdir(parents=True, exist_ok=True)
DESKTOP.mkdir(parents=True, exist_ok=True)

transparent_mark = draw_mark(1024, transparent=True)
transparent_mark.save(BRAND / "logo-mark-transparent.png", optimize=True)
draw_mark(1024).save(BRAND / "app-icon-1024.png", optimize=True)
draw_mark(512).save(BRAND / "icon-512.png", optimize=True)
draw_mark(512, safe=.08).save(BRAND / "icon-maskable-512.png", optimize=True)
draw_mark(192).save(BRAND / "icon-192.png", optimize=True)
draw_mark(256).save(BRAND / "logo-mark-256.png", optimize=True)
draw_mark(64).save(BRAND / "logo-mark-64.png", optimize=True)
draw_mark(150).save(BRAND / "mstile-150.png", optimize=True)
draw_mark(180).save(PUBLIC / "apple-touch-icon.png", optimize=True)
draw_mark(32).save(PUBLIC / "favicon-32x32.png", optimize=True)
draw_mark(16).save(PUBLIC / "favicon-16x16.png", optimize=True)

desktop_icon = draw_mark(256)
desktop_icon.save(DESKTOP / "shadowframe.png", optimize=True)
desktop_icon.save(DESKTOP / "shadowframe.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

banner((1200, 630), "social-card.png")
banner((1280, 640), "github-banner.png")
banner((1500, 500), "banner-wide.png", "wide")
cover(Image.open(MASTER).convert("RGB"), (1920, 1080)).save(BRAND / "hero-background.jpg", quality=94, optimize=True)

print(f"Brand assets created in {BRAND}")
