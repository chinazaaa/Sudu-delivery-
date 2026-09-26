# -*- coding: utf-8 -*-
"""
The flyer, for parents.

Everything on it is read from the shop rather than written by hand: the
prices are the cheapest real box on each shelf and the number is the one in
settings. A flyer that quotes a price the site does not is worse than no
flyer.
"""
W, H = 1080, 1350
ORANGE = "#ff5a1f"
SHELL = "#fff1ea"
INK = "#14110f"
MUTED = "#6b6360"
PAPER = "#ffffff"

ROWS = [
    ("Restocks", "Noodles, milk, cereal, the things that run out", 19150),
    ("Study and exam", "Snacks and drinks for a week of finals", 21700),
    ("Care packages", "Food from home, packed and carried to their block", 23400),
    ("Monthly foodstuff", "Rice, indomie, oil, tomatoes. A month of cooking", 27750),
    ("Keeping clean", "Detergent, soap, bucket, the whole cupboard", 24900),
    ("Hostel packs", "Everything a first year needs, one delivery", 38500),
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

def text(x, y, s, size, weight="normal", fill=INK, anchor="start", spacing="0"):
    return (
        '<text x="%d" y="%d" font-family="DejaVu Sans" font-size="%d" '
        'font-weight="%s" fill="%s" text-anchor="%s" letter-spacing="%s">%s</text>'
        % (x, y, size, weight, fill, anchor, spacing, s)
    )

out = []
out.append('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H))
out.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, SHELL))

# The mark and the name, top left, the way it sits on the site.
out.append(LOGO.format(x=64, y=56, s=96.0 / 512, bg=SHELL))
out.append(text(176, 126, "Sudu", 58, "bold"))
out.append(text(64, 196, "Delivery to Pan-Atlantic University", 26, "normal", MUTED))

# The line a parent reads first. Their problem, not our product.
out.append(text(64, 276, "You can’t drive to PAU", 66, "bold"))
out.append(text(64, 346, "every other weekend.", 66, "bold"))
out.append(text(64, 402, "Send a box instead. We pack it here and", 29, "normal", MUTED))
out.append(text(64, 438, "carry it to their block.", 29, "normal", MUTED))

# The shelves, with the real cheapest box on each.
top = 486
row_h = 88
out.append('<rect x="48" y="%d" width="%d" height="%d" rx="32" fill="%s"/>'
           % (top, W - 96, row_h * len(ROWS) + 36, PAPER))

y = top + 32
for name, said, price in ROWS:
    out.append(text(88, y + 30, name, 32, "bold"))
    out.append(text(88, y + 62, said, 21, "normal", MUTED))
    out.append(text(W - 88, y + 42, "from " + naira(price), 30, "bold", ORANGE, "end"))
    y += row_h

# The two things that actually answer a parent's objections.
band = top + row_h * len(ROWS) + 54
out.append('<rect x="48" y="%d" width="%d" height="118" rx="28" fill="%s"/>' % (band, W - 96, ORANGE))
out.append(text(W // 2, band + 44, "Delivery is included in every price", 31, "bold", "#ffffff", "middle"))
out.append(text(W // 2, band + 78, "Order any day, and pick the day it arrives.", 22, "normal", "#ffe6da", "middle"))
out.append(text(W // 2, band + 106, "Paying from abroad? A card link in pounds or dollars.", 22, "normal", "#ffe6da", "middle"))

# Where to go. Two ways, because a parent who will not install anything
# still has WhatsApp.
foot = band + 182
out.append(text(W // 2, foot, "sudu.store", 54, "bold", INK, "middle"))
out.append(text(W // 2, foot + 46, "WhatsApp +234 903 217 5147", 29, "normal", MUTED, "middle"))

out.append("</svg>")
open("marketing/sudu-parents-flyer.svg", "w").write("\n".join(out))
print("svg written")
