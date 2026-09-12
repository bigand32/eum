"""브랜드 로고 원본(단색 배경)에서 마크만 잘라 투명 PNG / 앱 아이콘을 생성."""

import sys
from PIL import Image

SRC = sys.argv[1]
OUT_MARK = sys.argv[2]
OUT_ICON = sys.argv[3]

img = Image.open(SRC).convert("RGB")
w, h = img.size
px = img.load()

# 배경색: 네 꼭짓점 평균
corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


bg_luma = luma(bg)

# 마크 영역: 배경보다 뚜렷하게 어두운 픽셀 (흰 스파클/반사光 제외)
left, top, right, bottom = w, h, 0, 0
for y in range(h):
    for x in range(w):
        if bg_luma - luma(px[x, y]) > 30:
            left = min(left, x)
            right = max(right, x)
            top = min(top, y)
            bottom = max(bottom, y)

pad = 12
box = (
    max(0, left - pad),
    max(0, top - pad),
    min(w, right + 1 + pad),
    min(h, bottom + 1 + pad),
)
mark = img.crop(box)

# 정사각 아이콘: 배경색으로 패딩
side = max(mark.size)
icon = Image.new("RGB", (side, side), bg)
icon.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2))
icon.resize((512, 512), Image.LANCZOS).save(OUT_ICON)

# 투명 마크: 배경색과의 거리로 알파 계산
rgba = mark.convert("RGBA")
mp = rgba.load()
for y in range(rgba.height):
    for x in range(rgba.width):
        r, g, b, _ = mp[x, y]
        dist = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
        alpha = 0 if dist <= 6 else min(255, int((dist - 6) / 28 * 255))
        mp[x, y] = (r, g, b, alpha)
rgba.save(OUT_MARK)

print(f"bg={bg} crop={box} mark={rgba.size}")
