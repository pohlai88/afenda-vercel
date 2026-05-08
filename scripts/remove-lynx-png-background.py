#!/usr/bin/env python3
"""
Strip studio backgrounds from Lynx mascot PNGs under public/icons/lynx/.

- Opaque near-white borders: OpenCV floodFill with FLOODFILL_FIXED_RANGE from
  sparse edge seeds (compares to the seed pixel, so light fur does not leak in
  the way a naive BFS along similar neighbors does).
- Other RGBA assets: GrabCut with border = definite background and a central
  probable-foreground band, then clear definite background.

Run from repo root:
  python scripts/remove-lynx-png-background.py

Requires (repo-local venv — gitignored):
  python -m venv .venv
  Windows: .venv\\Scripts\\pip install -r scripts/requirements-python.txt
  Unix:    .venv/bin/python -m pip install -r scripts/requirements-python.txt
  Cursor/VS Code uses `.vscode/settings.json` → `.venv`; reload window if imports stay unresolved.

If a previous run over-transparentized a file, restore the original PNG from
source control or design export, then run this script again.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
LYNX_DIR = REPO / "public" / "icons" / "lynx"

WHITE_BORDER_ALPHA_MEAN_MIN = 200.0

# Edge seeds must look like studio white (opaque).
WHITE_SEED_MIN_RGB = 246
WHITE_SEED_MAX_SPAN = 14

# floodFill FIXED_RANGE: each filled pixel stays within this BGR distance of the
# seed pixel for that flood (per channel).
WHITE_FLOOD_BGR_SPAN = 10


def _border_alpha_mean_rgba(rgba: np.ndarray) -> float:
    h, w, _ = rgba.shape
    top = rgba[0, :, 3]
    bot = rgba[-1, :, 3]
    left = rgba[1:-1, 0, 3]
    right = rgba[1:-1, -1, 3]
    return float(np.concatenate([top, bot, left, right]).mean())


def _is_white_edge_seed(r: int, g: int, b: int, a: int) -> bool:
    if a < 220:
        return False
    lo = min(r, g, b)
    hi = max(r, g, b)
    if lo < WHITE_SEED_MIN_RGB:
        return False
    if hi - lo > WHITE_SEED_MAX_SPAN:
        return False
    return True


def _edge_seed_coords(w: int, h: int) -> list[tuple[int, int]]:
    step_x = max(w // 64, 8)
    step_y = max(h // 64, 8)
    out: list[tuple[int, int]] = []
    for x in range(0, w, step_x):
        out.append((x, 0))
        out.append((x, h - 1))
    for y in range(0, h, step_y):
        out.append((0, y))
        out.append((w - 1, y))
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if (x, y) not in out:
            out.append((x, y))
    return out


def remove_white_flood_cv2(rgba: np.ndarray) -> np.ndarray:
    h, w = rgba.shape[:2]
    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    removed = np.zeros((h, w), dtype=bool)
    flags = (
        4
        | cv2.FLOODFILL_MASK_ONLY
        | cv2.FLOODFILL_FIXED_RANGE
        | (255 << 8)
    )
    lo_hi = (WHITE_FLOOD_BGR_SPAN, WHITE_FLOOD_BGR_SPAN, WHITE_FLOOD_BGR_SPAN)

    for sx, sy in _edge_seed_coords(w, h):
        r, g, b, a = (int(v) for v in rgba[sy, sx])
        if not _is_white_edge_seed(r, g, b, a):
            continue
        flood_mask = np.zeros((h + 2, w + 2), np.uint8)
        img = bgr.copy()
        try:
            cv2.floodFill(
                img,
                flood_mask,
                (sx, sy),
                (0, 0, 0),
                loDiff=lo_hi,
                hiDiff=lo_hi,
                flags=flags,
            )
        except cv2.error:
            continue
        removed |= flood_mask[1:-1, 1:-1] > 0

    out = rgba.copy()
    out[removed] = (0, 0, 0, 0)
    return out


def remove_grabcut(rgba: np.ndarray) -> np.ndarray:
    h, w, _ = rgba.shape
    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    mask_gc = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask_gc[0, :] = cv2.GC_BGD
    mask_gc[-1, :] = cv2.GC_BGD
    mask_gc[:, 0] = cv2.GC_BGD
    mask_gc[:, -1] = cv2.GC_BGD

    cy, cx = h // 2, w // 2
    rh, rw = max(h // 3, 1), max(w // 3, 1)
    mask_gc[cy - rh : cy + rh, cx - rw : cx + rw] = cv2.GC_PR_FGD
    r2, c2 = max(h // 10, 48), max(w // 10, 48)
    mask_gc[cy - r2 : cy + r2, cx - c2 : cx + c2] = cv2.GC_FGD

    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    m = mask_gc.copy()
    try:
        cv2.grabCut(bgr, m, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    except cv2.error:
        return rgba

    out = rgba.copy()
    definite_bg = (m == cv2.GC_BGD) | (m == cv2.GC_PR_BGD)
    out[definite_bg] = (0, 0, 0, 0)
    pr_fgd = m == cv2.GC_PR_FGD
    if np.any(pr_fgd):
        out[pr_fgd, 3] = (out[pr_fgd, 3].astype(np.float32) * 0.92).astype(np.uint8)
    return out


def process_one(path: Path) -> str:
    im = Image.open(path).convert("RGBA")
    rgba = np.array(im, dtype=np.uint8)
    border_mean = _border_alpha_mean_rgba(rgba)

    if border_mean >= WHITE_BORDER_ALPHA_MEAN_MIN:
        out = remove_white_flood_cv2(rgba)
        mode = "white_flood_cv2"
    else:
        out = remove_grabcut(rgba)
        mode = "grabcut"

    Image.fromarray(out, mode="RGBA").save(path, format="PNG", optimize=True)
    return mode


def main() -> int:
    if not LYNX_DIR.is_dir():
        print(f"Missing directory: {LYNX_DIR}", file=sys.stderr)
        return 1
    pngs = sorted(LYNX_DIR.glob("*.png"))
    if not pngs:
        print(f"No PNG files in {LYNX_DIR}", file=sys.stderr)
        return 1
    for p in pngs:
        mode = process_one(p)
        print(f"{p.name}: {mode}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
