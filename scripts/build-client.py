"""Inline the pet artwork into the browser half.

src/client.js keeps a tiny `'__PET_IMG__'` placeholder so the source stays
readable; this script writes the shipped client.js with a data URL instead.
"""

import base64
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "client.js"
ART = ROOT / "art" / "pet.webp"
OUT = ROOT / "client.js"

PLACEHOLDER = "'__PET_IMG__'"

source = SRC.read_text(encoding="utf-8")
if PLACEHOLDER not in source:
    sys.exit("placeholder missing in src/client.js")

data = base64.b64encode(ART.read_bytes()).decode("ascii")
url = "data:image/webp;base64," + data
OUT.write_text(source.replace(PLACEHOLDER, "'" + url + "'"), encoding="utf-8")

print("client.js:", OUT.stat().st_size, "bytes (art", ART.stat().st_size, "bytes)")
