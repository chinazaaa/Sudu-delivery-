# -*- coding: utf-8 -*-
"""
The market flyer, for students, in both shapes.

Not the restaurant pitch. This one is for somebody who has worked out that
buying cooked food twice a day is what is emptying their account, and who
would cook if the market were not a trip they have to make.

The one number here is the flat fee. Market shopping is charged by what
the shopping comes to, not by how many things it is, so a full cart and a
bag of rice cost the same to bring. That only became true today, and it is
the whole argument: nobody adds a fourth thing to a basket if the fourth
thing raises the delivery.

Real items at real prices underneath it, because "we sell foodstuff" is a
claim and "Ijebu garri, a derica, N800" is a receipt.
"""
import sys

ORANGE = "#ff5a1f"
SHELL = "#fff1ea"
INK = "#14110f"
MUTED = "#6b6360"
PAPER = "#ffffff"
CREAM = "#ffe6da"

# Straight off the shelf, cheapest first, the things a student actually
# cooks with. Prices as the shop charges them today.
GOODS = [
    ("Golden Penny noodles", 300),
    ("Ijebu garri, a derica", 800),
    ("Rice, half derica", 1150),
    ("Palm oil, half bottle", 1200),
]

PACKS = [
    ("Restocks", "The things that run out", 19150),
    ("Keeping clean", "The whole cupboard", 24900),
    ("Monthly foodstuff", "A month of cooking", 27750),
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
    mid = W // 2
    after_hero = 276 if tight else 306
    goods_h = 56 if tight else 64
    before_packs = 38 if tight else 46
    packs_h = 72 if tight else 78
    before_foot = 58 if tight else 62

    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H)]
    out.append('<rect width="%d" height="%d" fill="%s"/>' % (W, H, SHELL))

    out.append(LOGO.format(x=mid - 52, y=top_safe, s=104.0 / 512, bg=SHELL))
    out.append(text(mid, top_safe + 164, "Sudu", 56, "bold", INK, "middle"))
    out.append(text(mid, top_safe + 208, "The market, carried to your block", 26, "normal", MUTED, "middle"))

    # The one number. It is flat, which is the entire point.
    y = top_safe + 292
    out.append('<rect x="56" y="%d" width="%d" height="252" rx="40" fill="%s"/>' % (y, W - 112, ORANGE))
    out.append(text(mid, y + 68, "However many bags.", 42, "bold", "#ffffff", "middle"))
    out.append(text(mid, y + 156, naira(3000) + " delivery.", 78, "bold", "#ffffff", "middle"))
    out.append(text(mid, y + 208, "Up to " + naira(30000) + " of shopping, one flat fee.", 24, "normal", CREAM, "middle"))

    # The receipt. A claim proves nothing; six real prices do.
    y2 = y + after_hero
    out.append(text(mid, y2, "326 things from the market", 38, "bold", INK, "middle"))
    at = y2 + 46
    for name, price in GOODS:
        out.append(text(104, at + 36, name, 27, "normal", INK))
        out.append(text(W - 104, at + 36, naira(price), 27, "bold", ORANGE, "end"))
        at += goods_h

    # Or let somebody else do the shopping.
    y3 = at + before_packs
    out.append('<rect x="56" y="%d" width="%d" height="%d" rx="36" fill="%s"/>'
               % (y3, W - 112, packs_h * len(PACKS) + 74, PAPER))
    out.append(text(mid, y3 + 52, "Or a pack, already shopped for", 30, "bold", INK, "middle"))
    at = y3 + 74
    for name, said, price in PACKS:
        out.append(text(100, at + 32, name, 28, "bold"))
        out.append(text(100, at + 60, said, 21, "normal", MUTED))
        out.append(text(W - 100, at + 44, "from " + naira(price), 27, "bold", ORANGE, "end"))
        at += packs_h

    foot = y3 + packs_h * len(PACKS) + 74 + before_foot
    out.append(text(mid, foot, "sudu.store", 54, "bold", INK, "middle"))
    out.append(text(mid, foot + 46, "On the App Store · WhatsApp +234 903 217 5147", 26, "normal", MUTED, "middle"))

    last = foot + 46
    if last > bottom_safe:
        sys.exit("%s: last line at %d, past the safe area at %d" % (out_path, last, bottom_safe))

    out.append("</svg>")
    open(out_path, "w").write("\n".join(out))
    print("%s ok, last line %d of %d" % (out_path, last, bottom_safe))


draw(1080, 1920, 272, 1640, "marketing/sudu-market-status.svg")
draw(1080, 1350, 40, 1320, "marketing/sudu-market-flyer.svg", tight=True)
