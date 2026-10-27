"""Build the pet artwork from the supplied picture.

Input : art/source.png -- the full-body picture (already cut out, transparent
        background, 578x640).
Output: art/pet.webp  (trimmed, sized for the overlay)
        icon.png      (256x256 plugin icon)

Nothing is repainted: the picture is only trimmed and resized, so the pet looks
exactly like the original drawing.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # bundled runtime keeps site-packages outside sys.path
    sys.path.append(
        r"C:\Users\lianzi\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\Lib\site-packages"
    )
    from PIL import Image

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "source.png"
OUT = ROOT / "art" / "pet.webp"

img = Image.open(SRC).convert("RGBA")
alpha = np.asarray(img)[:, :, 3]

ys, xs = np.where(alpha > 8)
pad = 2
box = (
    max(0, int(xs.min()) - pad),
    max(0, int(ys.min()) - pad),
    min(img.size[0], int(xs.max()) + pad + 1),
    min(img.size[1], int(ys.max()) + pad + 1),
)
pet = img.crop(box)
print("source:", img.size, "-> trimmed:", pet.size)

# 440px tall keeps it sharp downscaled to a ~165px-tall pet on a 2x screen.
scale = 440 / pet.size[1]
pet = pet.resize((max(1, round(pet.size[0] * scale)), 440), Image.LANCZOS)
pet.save(OUT, "WEBP", quality=92, method=6)
print("pet.webp:", OUT.stat().st_size, "bytes", pet.size)

icon = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
inner = pet.copy()
inner.thumbnail((232, 232), Image.LANCZOS)
icon.alpha_composite(inner, ((256 - inner.size[0]) // 2, (256 - inner.size[1]) // 2))
icon.save(ROOT / "icon.png", "PNG", optimize=True)
print("icon.png:", (ROOT / "icon.png").stat().st_size, "bytes", icon.size)
