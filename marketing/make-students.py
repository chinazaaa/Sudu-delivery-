# -*- coding: utf-8 -*-
"""
The student flyer, in both shapes.

A different argument from the parents' one. A parent is buying peace of
mind and will read six lines to get it. A student is deciding between us
and walking to the gate, has no money, and is looking at this on a status
for five seconds. So the whole thing is one number: what delivery costs
when four of you order together.

Every figure is read from the shop. The ladder's first band really is four
containers for four thousand, which is where the thousand each comes from,
and the box prices are the cheapest real box on each shelf.
"""
import sys

ORANGE = "#ff5a1f"
DEEP = "#d63f0c"
SHELL = "#fff1ea"
INK = "#14110f"
MUTED = "#6b6360"
PAPER = "#ffffff"
CREAM = "#ffe6da"

# The cheapest real box on each shelf a student would actually buy.
BOXES = [
    ("All-nighter", 15496),
    ("Just us two", 18495),
    ("Movie night", 18500),
    ("Games night", 32900),
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


def draw(W, H, top_safe, bottom_safe, out_path, tight=False):
    # The shorter canvas gets the same words in less room, so the gaps
    # close rather than the type shrinking. Small type is the one thing a
    # status and a flyer both punish.
    hero_h = 292 if tight else 316
    after_hero = 352 if tight else 384
    before_boxes = 96 if tight else 108
    after_boxes = 40 if tight else 56
    before_foot = 72 if tight else 84
    mid = W // 2
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H)]
    out.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, SHELL))

    out.append(LOGO.format(x=mid - 52, y=top_safe, s=104.0 / 512, bg=SHELL))
    out.append(text(mid, top_safe + 164, "Sudu", 56, "bold", INK, "middle"))
    out.append(text(mid, top_safe + 208, "Food to PAU, any block", 26, "normal", MUTED, "middle"))

    # The one number this is about, made the loudest thing on the page.
    y = top_safe + 300
    out.append('<rect x="56" y="%d" width="%d" height="%d" rx="40" fill="%s"/>' % (y, W - 112, hero_h, ORANGE))
    out.append(text(mid, y + 72, "Order together.", 50, "bold", "#ffffff", "middle"))
    out.append(text(mid, y + 176, naira(1000) + " each.", 84, "bold", "#ffffff", "middle"))
    out.append(text(mid, y + 228, "Delivery is " + naira(4000) + " for up to four things.", 25, "normal", CREAM, "middle"))
    out.append(text(mid, y + 264, "Four of you on one order, and that is it split.", 25, "normal", CREAM, "middle"))

    # What there is to order, said as a count rather than a claim.
    y2 = y + after_hero
    out.append(text(mid, y2, "14 kitchens. 1,081 dishes.", 40, "bold", INK, "middle"))
    out.append(text(mid, y2 + 44, "Everybody adds their own. One delivery between you.", 25, "normal", MUTED, "middle"))

    # Boxes, for the nights nobody wants to plan.
    y3 = y2 + before_boxes
    row_h = 74
    out.append('<rect x="56" y="%d" width="%d" height="%d" rx="36" fill="%s"/>'
               % (y3, W - 112, row_h * len(BOXES) + 76, PAPER))
    out.append(text(mid, y3 + 52, "Or a box, already packed", 30, "bold", INK, "middle"))
    at = y3 + 76
    for name, price in BOXES:
        out.append(text(100, at + 44, name, 30, "bold"))
        out.append(text(W - 100, at + 44, "from " + naira(price), 29, "bold", ORANGE, "end"))
        at += row_h

    y4 = y3 + row_h * len(BOXES) + 76 + after_boxes
    out.append(text(mid, y4, "Skincare too: 2,103 products, one drop a week.", 25, "normal", MUTED, "middle"))

    foot = y4 + before_foot
    out.append(text(mid, foot, "sudu.store", 54, "bold", INK, "middle"))
    out.append(text(mid, foot + 46, "On the App Store · WhatsApp +234 903 217 5147", 26, "normal", MUTED, "middle"))

    last = foot + 46
    if last > bottom_safe:
        sys.exit("%s: last line at %d, past the safe area at %d" % (out_path, last, bottom_safe))

    out.append("</svg>")
    open(out_path, "w").write("\n".join(out))
    print("%s ok, last line %d of %d" % (out_path, last, bottom_safe))


# The status is taller, so it gets the room; the flyer is tighter.
draw(1080, 1920, 272, 1640, "marketing/sudu-students-status.svg")
draw(1080, 1350, 40, 1320, "marketing/sudu-students-flyer.svg", tight=True)
