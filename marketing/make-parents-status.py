# -*- coding: utf-8 -*-
"""
The same flyer, shaped for a WhatsApp status.

1080x1920, and the middle of it is the only part that is safe: WhatsApp
lays its own furniture over the top and the bottom of a status, so the
sender's name eats the first couple of hundred pixels and the reply box
eats the last. Everything that matters lives between them, which is why
this is not the flyer stretched.

Prices are read from the shop, never typed. See make-parents-flyer.py.
"""
W, H = 1080, 1920
TOP_SAFE, BOTTOM_SAFE = 272, 1640

ORANGE = "#ff5a1f"
SHELL = "#fff1ea"
INK = "#14110f"
MUTED = "#6b6360"
PAPER = "#ffffff"

ROWS = [
    ("Restocks", "The things that run out", 19150),
    ("Study and exam", "A week of finals", 21700),
    ("Care packages", "Food from home", 23400),
    ("Monthly foodstuff", "A month of cooking", 27750),
    ("Keeping clean", "The whole cupboard", 24900),
    ("Hostel packs", "A first year, sorted", 38500),
]

LOGO = '''
  <g transform="translate({x} {y}) scale({s})">
    <rect width="512" height="512" rx="116" fill="{bg}"/>
    <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill="#ff5a1f"/>
    <path d="M196 180v-26a60 60 0 0 1 120 0v26" fill="none" stroke="#14110f" stroke-width="28" stroke-linecap="round"/>
    <path d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
          fill="none" stroke="{bg}" stroke-width="34" stroke-linecap="round"/>
  </g>
'''


def naira(n):
    return "₦" + format(n, ",d")


def text(x, y, s, size, weight="normal", fill=INK, anchor="start"):
    return (
        '<text x="%d" y="%d" font-family="DejaVu Sans" font-size="%d" '
        'font-weight="%s" fill="%s" text-anchor="%s">%s</text>'
        % (x, y, size, weight, fill, anchor, s)
    )


out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H)]
out.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, SHELL))

# The mark, centred, because a status is looked at head on.
out.append(LOGO.format(x=(W - 112) // 2, y=TOP_SAFE, s=112.0 / 512, bg=SHELL))
out.append(text(W // 2, TOP_SAFE + 176, "Sudu", 62, "bold", INK, "middle"))
out.append(text(W // 2, TOP_SAFE + 224, "Delivery to Pan-Atlantic University", 27, "normal", MUTED, "middle"))

# Their problem, not our product.
y = TOP_SAFE + 306
out.append(text(W // 2, y, "You can’t drive to PAU", 62, "bold", INK, "middle"))
out.append(text(W // 2, y + 74, "every other weekend.", 62, "bold", INK, "middle"))
out.append(text(W // 2, y + 136, "Send a box instead. We pack it here", 30, "normal", MUTED, "middle"))
out.append(text(W // 2, y + 178, "and carry it to their block.", 30, "normal", MUTED, "middle"))

# The shelves, with the real cheapest box on each.
top = y + 224
row_h = 88
out.append('<rect x="60" y="%d" width="%d" height="%d" rx="36" fill="%s"/>'
           % (top, W - 120, row_h * len(ROWS) + 40, PAPER))

at = top + 36
for name, said, price in ROWS:
    out.append(text(104, at + 30, name, 33, "bold"))
    out.append(text(104, at + 64, said, 22, "normal", MUTED))
    out.append(text(W - 104, at + 44, "from " + naira(price), 31, "bold", ORANGE, "end"))
    at += row_h

band = top + row_h * len(ROWS) + 66
out.append('<rect x="60" y="%d" width="%d" height="130" rx="32" fill="%s"/>' % (band, W - 120, ORANGE))
out.append(text(W // 2, band + 50, "Delivery is included in every price", 33, "bold", "#ffffff", "middle"))
out.append(text(W // 2, band + 86, "Order any day, and pick the day it arrives.", 23, "normal", "#ffe6da", "middle"))
out.append(text(W // 2, band + 116, "Paying from abroad? A card link in pounds or dollars.", 23, "normal", "#ffe6da", "middle"))

foot = band + 190
out.append(text(W // 2, foot, "sudu.store", 58, "bold", INK, "middle"))
out.append(text(W // 2, foot + 50, "WhatsApp +234 903 217 5147", 30, "normal", MUTED, "middle"))

if foot + 50 > BOTTOM_SAFE:
    raise SystemExit("the last line falls under WhatsApp's reply box: %d" % (foot + 50))

out.append("</svg>")
open("marketing/sudu-parents-status.svg", "w").write("\n".join(out))
print("safe: last line at", foot + 50, "of", BOTTOM_SAFE)
