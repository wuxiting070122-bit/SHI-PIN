"""Composite selected film frames beneath the user's transparent PSD cover art.

Run with Pillow installed: python scripts/create-video-posters.py
The editable source is source-design/record-cover-template.psd.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/images/video-covers"
OVERLAY = Image.open(ASSETS / "template/record-overlay.png").convert("RGBA")
FONT = "/System/Library/Fonts/Menlo.ttc"

POSTERS = [
    ("hpv", "GAME OF LIFE", "HPV PREVENTION", "01  /  HEALTH FILM"),
    ("campus-band", "CAMPUS BAND", "DOCUMENTARY", "02  /  LIVE RECORDING"),
    ("kexinrou", "KEXINROU", "COMMERCIAL", "03  /  BRAND FILM"),
]


for slug, title_a, title_b, subtitle in POSTERS:
    frame = Image.open(ASSETS / f"template/{slug}-frame.jpg").convert("RGB")
    # The left opening of the PSD is circular; give each still its own centered crop.
    photo = ImageOps.fit(frame, (1110, 1000), method=Image.Resampling.LANCZOS)
    if slug == "hpv":
        # The HPV film is portrait. Keep its full height and use a softened
        # extension of the same frame behind it, instead of cutting off faces.
        photo = photo.filter(ImageFilter.GaussianBlur(26))
        portrait = ImageOps.contain(frame, (1110, 1000), method=Image.Resampling.LANCZOS)
        x0 = (1110 - portrait.width) // 2
        mask = Image.new("L", portrait.size, 255)
        mask = mask.filter(ImageFilter.GaussianBlur(24))
        photo.paste(portrait, (x0, 0), mask)
    poster = Image.new("RGBA", OVERLAY.size, (12, 24, 42, 255))
    poster.paste(photo, (0, 0))
    poster.alpha_composite(OVERLAY)

    draw = ImageDraw.Draw(poster)
    x = 1125
    draw.line((x, 678, 1670, 678), fill=(143, 171, 214), width=2)
    draw.text((x, 695), "SHI PIN  /  MOTION ARCHIVE", font=ImageFont.truetype(FONT, 25), fill=(155, 181, 221))
    def title_font(text, desired):
        while desired > 20 and draw.textbbox((0, 0), text, font=ImageFont.truetype(FONT, desired))[2] > 545:
            desired -= 1
        return ImageFont.truetype(FONT, desired)

    draw.text((x, 750), title_a, font=title_font(title_a, 70), fill=(239, 241, 246))
    draw.text((x, 845), title_b, font=title_font(title_b, 62), fill=(239, 241, 246))
    draw.text((x, 946), subtitle, font=ImageFont.truetype(FONT, 24), fill=(155, 181, 221))
    poster.convert("RGB").save(ASSETS / f"{slug}-poster.jpg", quality=92, subsampling=0, optimize=True)
