"""플랫 아이콘 목업에서 타일을 잘라 브랜드 색으로 재채색.

목업의 흰 심볼/연한 타일을 (타일색, 심볼색) 조합으로 다시 칠하고,
라운드 스퀘어 마스크를 씌워 투명 배경 PNG로 저장한다.
"""

import sys
from PIL import Image, ImageDraw

SRC = sys.argv[1]
OUT_DIR = sys.argv[2]

img = Image.open(SRC).convert("RGB")
w, h = img.size
px = img.load()


def luma(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


# 아이콘 타일: 오른쪽 절반에서 넓은 면적을 차지하는 색 중 가장 어두운 것
# (카드 배경보다 타일이 조금 더 진하다)
half = w // 2
samples: dict[tuple[int, int, int], int] = {}
for y in range(0, h, 2):
    for x in range(half, w, 2):
        c = px[x, y]
        if max(c) - min(c) < 8:  # 흰 배경·심볼 제외
            continue
        samples[c] = samples.get(c, 0) + 1

area = sum(samples.values())
frequent = [c for c, n in samples.items() if n > area * 0.02]
tile_color = min(frequent, key=luma)
tile_luma = luma(tile_color)

def matches_tile(x: int, y: int) -> bool:
    return max(abs(px[x, y][i] - tile_color[i]) for i in range(3)) <= 4


# 행·열별 타일 픽셀 수를 세어 "꽉 찬" 구간만 타일로 인정 (그림자·카드 배경 제외)
col_hits = [sum(1 for y in range(h) if matches_tile(x, y)) for x in range(half, w)]
row_hits = [sum(1 for x in range(half, w) if matches_tile(x, y)) for y in range(h)]


def solid_span(hits: list[int]) -> tuple[int, int]:
    threshold = max(hits) * 0.6
    idx = [i for i, n in enumerate(hits) if n >= threshold]
    return idx[0], idx[-1]


x0, x1 = solid_span(col_hits)
y0, y1 = solid_span(row_hits)
left, right = half + x0, half + x1
top, bottom = y0, y1

side = min(right - left + 1, bottom - top + 1)
box = (left, top, left + side, top + side)
tile = img.crop(box)
print(f"tile_color=#{tile_color[0]:02x}{tile_color[1]:02x}{tile_color[2]:02x} box={box}")


def render(tile_hex: str, symbol_hex: str, out: str, size=512, transparent_tile=False):
    target = tuple(int(tile_hex[i : i + 2], 16) for i in (1, 3, 5))
    symbol = tuple(int(symbol_hex[i : i + 2], 16) for i in (1, 3, 5))

    base = tile.resize((size, size), Image.LANCZOS)
    bp = base.load()
    out_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    op = out_img.load()

    for y in range(size):
        for x in range(size):
            c = bp[x, y]
            # 심볼 비중: 타일보다 밝을수록 1에 가까움
            t = (luma(c) - tile_luma) / max(1.0, 255 - tile_luma)
            t = min(1.0, max(0.0, t))
            if transparent_tile:
                # 타일 영역의 미세한 잔상 제거 후 남은 범위를 0~1로 다시 펼침
                t = 0.0 if t < 0.12 else min(1.0, (t - 0.12) / 0.5)
                op[x, y] = (*symbol, int(round(t * 255)))
            else:
                op[x, y] = (
                    *tuple(round(target[i] + (symbol[i] - target[i]) * t) for i in range(3)),
                    255,
                )

    # iOS 스타일 라운드 스퀘어 마스크
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=round(size * 0.2237), fill=255
    )
    out_img.putalpha(
        Image.composite(out_img.getchannel("A"), Image.new("L", (size, size), 0), mask)
    )
    out_img.save(out)
    print("wrote", out)


BRAND_LOGO_COLOR = sys.argv[3] if len(sys.argv) > 3 else "#b39bd5"

render(BRAND_LOGO_COLOR, "#ffffff", f"{OUT_DIR}/icon-512.png")
render("#ffffff", BRAND_LOGO_COLOR, f"{OUT_DIR}/symbol-512.png", transparent_tile=True)
