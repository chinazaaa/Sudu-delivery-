# -*- coding: utf-8 -*-
"""
Nine square posters, as one grid.

They are written here together rather than one at a time because a feed is
seen as a block: nine posters made separately look like nine posters, and
nine made together look like a shop. So the palette alternates on a fixed
rhythm, the mark sits in the same corner on every one, and the type comes
off one scale.

Every number is read out of the shop. A poster quoting a price the site
does not honour is worse than no poster, and the way that happens is
somebody typing one.
"""
import sys

# Four by five, not square.
#
# A square looked right in the feed and wrong on the profile, because the
# grid shows a three by four portrait thumbnail: cropping 1080 square to
# that takes 135 pixels off each side, which is straight through the margin
# the type starts at, so every poster lost the first letter of its first
# word. Four by five crops to the same thumbnail losing 34 a side, which is
# inside the margin, and it is taller in the feed as well.
W = 1080
H = 1350
PAD = 88                      # the safe margin, wider than the grid's crop.
TOP = 236                     # under the mark.
FLOOR = H - 128               # above the address.
ORANGE = "#ff5a1f"
DEEP = "#c2410c"
SHELL = "#fff1ea"
INK = "#14110f"
MUTED = "#6b6360"
PAPER = "#ffffff"
CREAM = "#ffe6da"

LOGO = '''
  <g transform="translate({x} {y}) scale({s})">
    <rect width="512" height="512" rx="116" fill="{bg}"/>
    <path d="M116 180h280l-27 248a44 44 0 0 1-44 39H187a44 44 0 0 1-44-39z" fill="{bag}"/>
    <path d="M196 180v-26a60 60 0 0 1 120 0v26" fill="none" stroke="{handle}" stroke-width="28" stroke-linecap="round"/>
    <path d="M316 272C316 240 202 240 202 294C202 338 316 330 316 372C316 426 202 426 202 392"
          fill="none" stroke="{bg}" stroke-width="34" stroke-linecap="round"/>
  </g>
'''


def naira(n):
    return "₦" + format(n, ",d")


def text(x, y, s, size, weight="normal", fill=INK, anchor="start"):
    safe = (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return (
        '<text x="%d" y="%d" font-family="DejaVu Sans" font-size="%d" '
        'font-weight="%s" fill="%s" text-anchor="%s">%s</text>'
        % (x, y, size, weight, fill, anchor, safe)
    )


def wrap(s, per_line):
    """Break a line on spaces. Nothing here is long enough to need more."""
    out, line = [], ""
    for word in s.split():
        if line and len(line) + 1 + len(word) > per_line:
            out.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        out.append(line)
    return out


class Poster:
    def __init__(self, dark):
        """dark: the orange grounds. They alternate, so the feed has rhythm."""
        self.dark = dark
        self.bg = ORANGE if dark else SHELL
        self.ink = PAPER if dark else INK
        self.soft = CREAM if dark else MUTED
        self.parts = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H),
            '<rect width="%d" height="%d" fill="%s"/>' % (W, H, self.bg),
        ]
        # The mark, same corner every time, so nine posters read as one shop.
        self.parts.append(LOGO.format(
            x=PAD, y=PAD, s=84.0 / 512,
            bg=self.bg, bag=PAPER if dark else ORANGE, handle=self.ink,
        ))
        self.parts.append(text(PAD + 104, PAD + 56, "Sudu", 42, "bold", self.ink))
        self.parts.append(text(PAD + 104, PAD + 88, "Delivery to PAU", 21, "normal", self.soft))

    def add(self, part):
        self.parts.append(part)
        return self

    def foot(self, line="sudu.store"):
        self.parts.append(text(W // 2, H - PAD + 6, line, 30, "bold", self.ink, "middle"))
        return self

    def save(self, path):
        self.parts.append("</svg>")
        open(path, "w").write("\n".join(self.parts))
        print("wrote", path)


def statement(dark, lines, under, size=96):
    """A sentence, set large. The whole poster is the sentence.

    Sat in the middle of the space the mark and the address leave, rather
    than at a fixed height. A four word poster and a nine word one want the
    same optical centre, and a fixed top gave the short ones a hole under
    them a foot deep."""
    p = Poster(dark)
    step = int(size * 1.12)
    tall = step * len(lines) + 34 + 12 + 48 * len(under)
    # A third of the slack above rather than half. Dead centre is right on
    # a page nobody crops, and every place these get shared crops them:
    # a preview that catches only the empty half is a preview that says
    # nothing, so the words sit a little above the middle where more of the
    # crops look.
    top = TOP + max(0, int((FLOOR - TOP - tall) * 0.34))

    y = top + size
    for line in lines:
        p.add(text(PAD, y, line, size, "bold", p.ink))
        y += step
    # A short rule between the shout and the explanation, so the eye knows
    # the second block is a different voice rather than a third line.
    y -= step - int(size * 0.50)
    p.add('<rect x="%d" y="%d" width="120" height="7" rx="4" fill="%s" opacity="%s"/>'
          % (PAD, y, p.ink, "0.9" if dark else "1"))
    y += 70
    for line in under:
        p.add(text(PAD, y, line, 34, "normal", p.soft))
        y += 48
    return p


def listing(dark, title, price, note, items, tail):
    """A box, said as a receipt: what is in it and what it costs."""
    p = Poster(dark)
    p.add(text(PAD, 460, title, 62, "bold", p.ink))
    p.add(text(PAD, 506, note, 26, "normal", p.soft))

    card = 540
    rows = items[:7]
    height = 50 * len(rows) + 56
    p.add('<rect x="%d" y="%d" width="%d" height="%d" rx="32" fill="%s"/>'
          % (PAD - 16, card, W - (PAD - 16) * 2, height, PAPER if not dark else "#ffffff"))
    y = card + 58
    for one in rows:
        p.add(text(PAD + 16, y, "•", 26, "bold", ORANGE))
        p.add(text(PAD + 48, y, one, 27, "normal", INK))
        y += 50

    # The price and its note have to finish clear of the address at the
    # foot. They were landing on top of it, which is the one place on a
    # poster nothing is allowed to touch.
    p.add(text(PAD, card + height + 74, "from " + naira(price), 62, "bold", ORANGE if not dark else PAPER))
    p.add(text(PAD, card + height + 112, tail, 25, "normal", p.soft))
    return p


def shelves(dark, title, rows, under):
    """A price list. Four shelves, four numbers, nothing else."""
    p = Poster(dark)
    p.add(text(PAD, 460, title, 66, "bold", p.ink))
    y = 580
    for name, price in rows:
        p.add(text(PAD, y, name, 40, "bold", p.ink))
        p.add(text(W - PAD, y, "from " + naira(price), 38, "bold", ORANGE if not dark else PAPER, "end"))
        p.add('<rect x="%d" y="%d" width="%d" height="2" fill="%s" opacity="0.25"/>'
              % (PAD, y + 26, W - PAD * 2, p.ink))
        y += 104
    y += 12
    for line in under:
        p.add(text(PAD, y, line, 28, "normal", p.soft))
        y += 40
    return p


posters = []

# 1-3: what the shop is.
posters.append(("01-what-sudu-is", statement(
    True,
    ["Sudu delivers", "to PAU."],
    ["Food, gifts, care packages and more,", "carried to your block."],
)))

posters.append(("02-one-delivery", statement(
    False,
    ["One delivery.", "Every kitchen."],
    ["14 restaurants and 1,081 dishes in one list.",
     "Order together and split the delivery."],
)))

posters.append(("03-more-than-food", shelves(
    True,
    "More than food.",
    [("Care packages", 24200), ("Hostel packs", 43400),
     ("Restocks", 20050), ("Gifts", 33650)],
    ["Eighteen shelves, forty eight boxes.", "One price each, delivery in it."],
)))

# 4-6: the boxes, said as receipts.
posters.append(("04-care-packages", listing(
    False, "Care packages", 24200, "Food from home, packed and carried to their block.",
    ["10 x Golden Penny noodles", "Peak milk roll", "Milo refill, 400g",
     "Golden Penny cube sugar", "2 x Titus sardine", "4 x plain biscuit",
     "Ijebu garri, a derica"],
    "The Starter box. Four sizes up to ₦91,700.",
)))

posters.append(("05-hostel-packs", listing(
    False, "Hostel packs", 43400, "A room, sorted, before they arrive.",
    ["Bucket, 25 litre", "LED bulb", "Extension socket, 4 way", "Washing bowl",
     "Hangers, 6", "Bin bags, roll of 20", "Detergent, 1kg"],
    "Room basics. Up to ₦130,300 for the lot.",
)))

posters.append(("06-restocks", listing(
    False, "Restocks", 20050, "The things that run out, before they do.",
    ["10 x Golden Penny noodles", "Rice, a derica", "3 x Gino tomato paste",
     "Groundnut oil, half bottle", "2 x Titus sardine", "Toilet roll, 4 pack",
     "Bar soap"],
    "The Small restock. Monthly one is ₦49,500.",
)))

# 7-9: occasions, and November.
posters.append(("07-matriculation", statement(
    True,
    ["Matriculation", "day."],
    ["Cake, balloons and a card, carried to them.",
     "From ₦30,000, delivery in it."],
    size=88,
)))

posters.append(("08-birthday", statement(
    False,
    ["A birthday,", "at PAU."],
    ["A cake, pizza and drinks, on the day.",
     "From ₦25,600, delivery in it."],
    size=92,
)))

posters.append(("09-send-something", statement(
    True,
    ["Send something", "to someone", "at PAU."],
    ["Pay from anywhere. A card link in pounds",
     "or dollars, and we carry it to their block."],
    size=84,
)))

for name, p in posters:
    p.foot()
    p.save("marketing/instagram/%s.svg" % name)
