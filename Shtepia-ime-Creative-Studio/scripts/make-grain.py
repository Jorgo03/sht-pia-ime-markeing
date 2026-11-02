# Generates the seamless grain tiles used by print + cinematic modes
# (deterministic: fixed seed). Run: python3 scripts/make-grain.py
import random
from PIL import Image, ImageFilter
random.seed(7)
def tile(path, size, lo, hi, blur, alpha=None):
    im = Image.new('L', (size, size))
    im.putdata([random.randint(lo, hi) for _ in range(size * size)])
    if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
    if alpha is None:
        im.convert('RGB').save(path, optimize=True)
    else:
        a = Image.new('L', (size, size), alpha)
        rgba = Image.merge('RGBA', (im, im, im, a)); rgba.save(path, optimize=True)
# Paper fibre: light grey speckle for multiply (white = no change).
tile('assets/illustrations/paper-grain.png', 256, 212, 255, 0.6)
# Film grain: mid-grey noise for overlay blend (128 = no change).
tile('assets/illustrations/film-grain.png', 256, 70, 186, 0)
print('grain tiles written')
