"""브랜드 원본에서 로고·앱 아이콘 에셋 생성.

타일 원본은 흰 페이지 위에 놓인 라운드 사각 타일 두 개(좌:워드마크 / 우:심볼)다. 타일 안의
흰 글리프만 알파로 뽑아내야 하는데, 타일 bbox 안에는 라운드 모서리 밖의 흰 페이지 배경도
포함된다. 라운드 사각형은 행마다 보라 픽셀이 하나의 연속 구간이므로, 행별 보라 최소~최대
열을 타일 내부로 보고 그 안에서만 글리프를 찾는다.

워드마크 원본을 따로 주면(보라 잉크 + 흰 배경) 타일에서 뽑는 대신 그걸 쓴다. 어느 쪽이든
출력 색은 BRAND_VIOLET 으로 다시 칠하므로 원본들의 보라 톤이 달라도 결과는 일관된다.

usage: prepare-brand-assets.py <tiles.png> [wordmark.png]
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageFilter

BRAND_VIOLET = (0x44, 0x01, 0xA9)
# 타일 테두리의 안티에일리어싱(보라~흰 혼합) 픽셀을 글리프로 오인하지 않도록 내부를 침식할 폭
INTERIOR_ERODE_PX = 3
# 이 밝기 이상이면 배경으로 보고 완전 투명 처리 (원본 흰 배경이 254 정도로 살짝 어둡다)
INK_WHITE_FLOOR = 250.0
# 타일 원본의 보라 톤이 BRAND_VIOLET 과 정확히 같지 않아 배경에 옅은 알파가 남는다.
# 이 밝기 차이 이하는 배경으로 본다.
GLYPH_FLOOR = 20.0
ICON_SIZE = 512
APPLE_ICON_SIZE = 180
# 앱 아이콘에서 심볼이 차지하는 비율 (iOS/안드로이드 아이콘 여백 관례)
ICON_GLYPH_RATIO = 0.6
# 투명 에셋 가로 기준 크기
MARK_WIDTH = 512


def _luma(rgb: np.ndarray) -> np.ndarray:
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def _violet_mask(rgb: np.ndarray) -> np.ndarray:
    """브랜드 보라에 충분히 가까운 픽셀만. 테두리 혼합색이 섞이면 타일 내부 판정이 어긋난다."""
    diff = np.abs(rgb.astype(np.int16) - np.array(BRAND_VIOLET, dtype=np.int16))
    return diff.max(axis=-1) <= 60


def _tile_boxes(violet: np.ndarray) -> list[tuple[int, int]]:
    """보라 영역을 열 방향 공백으로 나눠 타일별 x 구간을 돌려준다."""
    xs = np.where(violet.any(axis=0))[0]
    splits = np.where(np.diff(xs) > 5)[0]
    bounds, start = [], xs[0]
    for i in splits:
        bounds.append((int(start), int(xs[i])))
        start = xs[i + 1]
    bounds.append((int(start), int(xs[-1])))
    return bounds


def _glyph_alpha(rgb: np.ndarray, violet: np.ndarray, x0: int, x1: int) -> np.ndarray:
    """타일 내부의 흰 글리프를 알파로 변환 (0=보라 배경, 255=흰 글리프)."""
    sub_violet = violet[:, x0 : x1 + 1]
    rows = np.where(sub_violet.any(axis=1))[0]
    interior = np.zeros_like(sub_violet)
    for y in rows:
        cols = np.where(sub_violet[y])[0]
        interior[y, cols[0] : cols[-1] + 1] = True

    eroded = Image.fromarray((interior * 255).astype(np.uint8)).filter(
        ImageFilter.MinFilter(INTERIOR_ERODE_PX * 2 + 1)
    )
    interior = np.asarray(eroded) > 127

    lum = _luma(rgb[:, x0 : x1 + 1].astype(np.float64))
    base = float(_luma(np.array(BRAND_VIOLET, dtype=np.float64))) + GLYPH_FLOOR
    alpha = np.clip((lum - base) / (255.0 - base), 0.0, 1.0) * 255.0
    return np.where(interior, alpha, 0.0)


def _ink_alpha(rgb: np.ndarray) -> np.ndarray:
    """흰 배경 위 진한 잉크를 알파로 변환. 살짝 회색인 배경도 완전 투명이 되게 여유를 둔다."""
    lum = _luma(rgb.astype(np.float64))
    ink = float(_luma(np.array(BRAND_VIOLET, dtype=np.float64)))
    return np.clip((INK_WHITE_FLOOR - lum) / (INK_WHITE_FLOOR - ink), 0.0, 1.0) * 255.0


def _tinted(alpha: np.ndarray, color: tuple[int, int, int]) -> Image.Image:
    h, w = alpha.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = color
    out[..., 3] = alpha.astype(np.uint8)
    img = Image.fromarray(out, mode="RGBA")
    box = img.getchannel("A").point(lambda a: 255 if a >= 12 else 0).getbbox()
    return img.crop(box) if box else img


def _scaled(img: Image.Image, width: int, color: tuple[int, int, int]) -> Image.Image:
    """리사이즈 후 색을 다시 찍는다. LANCZOS 는 균일한 RGB 도 ±1 흔들어 놓는다."""
    height = max(1, round(img.height * width / img.width))
    arr = np.asarray(img.resize((width, height), Image.LANCZOS)).copy()
    arr[..., 0], arr[..., 1], arr[..., 2] = color
    return Image.fromarray(arr)


def _app_icon(white_glyph: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (*BRAND_VIOLET, 255))
    target = size * ICON_GLYPH_RATIO
    scale = min(target / white_glyph.width, target / white_glyph.height)
    glyph = white_glyph.resize(
        (max(1, round(white_glyph.width * scale)), max(1, round(white_glyph.height * scale))),
        Image.LANCZOS,
    )
    canvas.paste(glyph, ((size - glyph.width) // 2, (size - glyph.height) // 2), glyph)
    return canvas


def main(tiles_path: str, wordmark_path: str | None) -> None:
    rgb = np.asarray(Image.open(tiles_path).convert("RGB"))
    violet = _violet_mask(rgb)
    boxes = _tile_boxes(violet)
    if len(boxes) != 2:
        raise SystemExit(f"타일 2개를 기대했지만 {len(boxes)}개를 찾았습니다: {boxes}")

    # 넓은 타일이 워드마크, 좁은 타일이 심볼
    boxes.sort(key=lambda b: b[1] - b[0], reverse=True)
    (wm_x0, wm_x1), (sym_x0, sym_x1) = boxes

    symbol_alpha = _glyph_alpha(rgb, violet, sym_x0, sym_x1)
    if wordmark_path:
        wordmark_alpha = _ink_alpha(np.asarray(Image.open(wordmark_path).convert("RGB")))
    else:
        wordmark_alpha = _glyph_alpha(rgb, violet, wm_x0, wm_x1)

    white = (255, 255, 255)
    outputs = {
        "public/brand/logo-wordmark.png": _scaled(
            _tinted(wordmark_alpha, BRAND_VIOLET), MARK_WIDTH, BRAND_VIOLET
        ),
        "public/brand/logo-wordmark-light.png": _scaled(
            _tinted(wordmark_alpha, white), MARK_WIDTH, white
        ),
        "public/brand/logo-mark.png": _scaled(
            _tinted(symbol_alpha, BRAND_VIOLET), MARK_WIDTH, BRAND_VIOLET
        ),
        "public/brand/logo-mark-light.png": _scaled(
            _tinted(symbol_alpha, white), MARK_WIDTH, white
        ),
    }

    white_symbol = _tinted(symbol_alpha, (255, 255, 255))
    outputs["src/app/icon.png"] = _app_icon(white_symbol, ICON_SIZE)
    outputs["src/app/apple-icon.png"] = _app_icon(white_symbol, APPLE_ICON_SIZE)

    for path, img in outputs.items():
        img.save(path, optimize=True)
        print(f"{path}: {img.width}x{img.height}")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) == 3 else None)
