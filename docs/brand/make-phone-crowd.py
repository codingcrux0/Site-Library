# Re-makes public/images/open-peeps-crowd-phone.png (the smaller crowd picture phones download) from the full one.
# Needs Python 3 and Pillow (pip install pillow). It is a one-off helper, not part of the site's build and not a site dependency.
# Run from the project root:  python3 docs/brand/make-phone-crowd.py
# It copies 45 of the 101 figures PIXEL FOR PIXEL (same palette, nothing re-compressed lossily) into a grid 9 across and 5 down.
# If you change the grid, change PHONE_SHEET in src/components/ui/skiper39.tsx to match.
from PIL import Image

SRC = "public/images/open-peeps-crowd.png"   # 15 figures across, 7 down, each 240 x 324
OUT = "public/images/open-peeps-crowd-phone.png"
ACROSS, DOWN = 15, 7
PHONE_ACROSS, PHONE_DOWN = 9, 5
# Chosen once with a random sample (seed 11), skipping the 4 figures that hold knives (17, 72, 92, 100). Counted left to right, then top to bottom.
CHOSEN = [0, 1, 3, 4, 5, 7, 8, 11, 12, 19, 21, 24, 25, 26, 30, 31, 32, 39, 41, 42, 43, 51, 57, 58, 60, 61, 64, 66, 68, 69,
          73, 77, 78, 80, 82, 83, 86, 88, 93, 96, 97, 99, 101, 102, 104]

full = Image.open(SRC)                      # "P" mode: every pixel is a number pointing into a palette of colours
cell_w, cell_h = full.width // ACROSS, full.height // DOWN
sheet = Image.new("P", (PHONE_ACROSS * cell_w, PHONE_DOWN * cell_h), 0)
sheet.putpalette(full.getpalette())
transparency = full.info["transparency"]    # which palette entries are see-through
sheet.info["transparency"] = transparency
for n, i in enumerate(CHOSEN):
    left, top = (i % ACROSS) * cell_w, (i // ACROSS) * cell_h
    figure = full.crop((left, top, left + cell_w, top + cell_h))
    sheet.paste(figure, ((n % PHONE_ACROSS) * cell_w, (n // PHONE_ACROSS) * cell_h))
sheet.save(OUT, optimize=True, transparency=transparency)
print("Made", OUT, sheet.size)
