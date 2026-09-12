"""프로모 배너 아트(3D 렌더)를 투명 PNG로 정리 — 배경 제거 + 여백 트림 + 정사각 리사이즈.

생성 이미지의 배경은 완전 단색이 아니라 미세한 비네트 그라데이션이라, 꼭짓점 색과의
단순 비교로는 배경이 남는다. 테두리 픽셀로 2차 곡면을 최소자승 피팅해 배경을 모델링하고,
그 모델과의 색 차이를 알파로 쓴다. 부드러운 그림자는 반투명으로 남아 어떤 배경 위에서도
자연스럽게 얹힌다.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

SIZE = 384
BORDER = 8
# 배경 모델과의 색 거리 → 알파. FLOOR 이하 완전 투명, CEIL 이상 완전 불투명.
# FLOOR를 접지 그림자의 색 차이보다 높게 잡아야 어두운 배너 위에서 흰 후광으로 뜨지 않는다.
FLOOR = 20.0
CEIL = 42.0
# 트림 기준 알파 (그림자는 살리되 잔여 노이즈는 버림)
TRIM_ALPHA = 40
MARGIN_RATIO = 0.06


def _basis(xs: np.ndarray, ys: np.ndarray) -> np.ndarray:
    """2차 다항 기저 — 완만한 비네트/그라데이션을 표현할 정도면 충분."""
    return np.stack([np.ones_like(xs), xs, ys, xs * xs, ys * ys, xs * ys], axis=-1)


def _background_model(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    xs = xs / (w - 1) * 2 - 1
    ys = ys / (h - 1) * 2 - 1

    edge = np.zeros((h, w), dtype=bool)
    edge[:BORDER, :] = edge[-BORDER:, :] = True
    edge[:, :BORDER] = edge[:, -BORDER:] = True

    a_edge = _basis(xs[edge], ys[edge])
    coeffs, *_ = np.linalg.lstsq(a_edge, rgb[edge], rcond=None)
    return _basis(xs, ys) @ coeffs


def prepare(src_path: str, out_path: str) -> None:
    img = Image.open(src_path).convert("RGB")
    rgb = np.asarray(img, dtype=np.float64)

    residual = np.abs(rgb - _background_model(rgb)).max(axis=-1)
    alpha = np.clip((residual - FLOOR) / (CEIL - FLOOR), 0.0, 1.0) * 255.0

    rgba = Image.merge("RGBA", (*img.split(), Image.fromarray(alpha.astype(np.uint8))))

    # 트림 박스는 잔여 스펙클을 지운 마스크로 계산
    mask = rgba.getchannel("A").point(lambda a: 255 if a >= TRIM_ALPHA else 0)
    box = mask.filter(ImageFilter.MedianFilter(5)).getbbox()
    if box is None:
        raise SystemExit(f"{src_path}: 피사체를 찾지 못했습니다")
    art = rgba.crop(box)

    side = int(max(art.size) * (1 + MARGIN_RATIO * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(art, ((side - art.width) // 2, (side - art.height) // 2), art)
    canvas.resize((SIZE, SIZE), Image.LANCZOS).save(out_path, optimize=True)

    print(f"{out_path}: crop={box} -> {SIZE}x{SIZE}")


if __name__ == "__main__":
    pairs = sys.argv[1:]
    if not pairs or len(pairs) % 2:
        raise SystemExit("usage: prepare-promo-art.py <src> <out> [<src> <out> ...]")
    for i in range(0, len(pairs), 2):
        prepare(pairs[i], pairs[i + 1])
