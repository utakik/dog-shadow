---
name: hand-dog-shadow
description: Work on the Hand Dog Shadow repository, a two-mode OpenCV and MediaPipe hand-tracking experiment. Use when Codex needs to run, reorganize, preserve, or extend the PNG dog-head puppet mode or the PNG-free skeleton/mask/pixel visual mode, especially while preserving mouth calibration values and keeping the two modes separate.
---

# Hand Dog Shadow

Use this skill for the Hand Dog Shadow repository: a live camera experiment that turns hand motion into dog-shadow-like visuals with OpenCV, MediaPipe Hands, and NumPy.

## Repository Layout

```text
dog-shadow/
├─ SKILL.md
├─ README.md
├─ requirements.txt
├─ mode_png_puppet/
│  ├─ dog_overlay_live.py
│  └─ assets/
│     ├─ head.png
│     └─ jaw.png
└─ mode_skeleton_pixel/
   └─ dog_overlay_live_v0_6_stable.py
```

## Modes

### PNG Puppet Mode

Use `mode_png_puppet/dog_overlay_live.py` when the user wants the dog-head puppet controlled by hand motion.

This mode:

- loads `mode_png_puppet/assets/head.png`
- loads `mode_png_puppet/assets/jaw.png`
- detects one hand with MediaPipe Hands
- maps landmarks to head angle, horizontal flip, scale, and jaw opening
- overlays the two RGBA PNG layers on the mirrored camera feed

Run it with:

```bash
python3 mode_png_puppet/dog_overlay_live.py
```

Controls:

- `l`: toggle landmark display
- `c`: switch camera when multiple cameras are detected
- `q`: quit

### Skeleton Pixel Mode

Use `mode_skeleton_pixel/dog_overlay_live_v0_6_stable.py` when the user wants the PNG-free hand-mask, contour, and pixelization expression path.

This mode:

- does not load `head.png` or `jaw.png`
- builds a hand mask from MediaPipe landmarks
- exposes `thr`, `smooth`, `close`, and `grid` trackbars
- draws contours and pixelizes the detected hand region

Run it with:

```bash
python3 mode_skeleton_pixel/dog_overlay_live_v0_6_stable.py
```

Controls:

- `thr`, `smooth`, `close`, `grid`: visual tuning trackbars
- `q` or `Esc`: quit

Keep this mode separate from PNG Puppet Mode. It is a candidate for the main visual direction and should not be folded into the PNG pipeline by default.

## Parameters To Preserve

In PNG Puppet Mode, preserve these mouth calibration values unless the user explicitly asks for recalibration:

```python
CLOSED_RATIO = 0.29
OPEN_RATIO = 0.36
```

Other current puppet parameters:

```python
MAX_JAW_ANGLE_DEG = 30
DOG_SIZE_SCALE = 1.28
DOG_ANGLE_OFFSET_DEG = 0.0
Z_WEIGHT = 0.4
ANGLE_SMOOTH = 0.3
TILT_MAX_DEG = 50.0
TILT_GAIN = 3.0
TILT_BIAS_DEG = -18.0
DX_DEADZONE = 0.03
JAW_SMOOTH = 0.4
```

Known skeleton/pixel observation from earlier exploration:

```text
Best hand-contour-looking parameter observed earlier: thr=0, smooth=112.
```

Treat this as a useful observation, not as a hard requirement.

## Landmark Mapping For PNG Puppet Mode

Current mapping:

- `WRIST`: scale reference
- `MIDDLE_FINGER_MCP`: direction base
- `MIDDLE_FINGER_TIP`: direction tip and mouth control
- `PINKY_TIP`: mouth control with middle fingertip
- `RING_FINGER_MCP`: dog placement center

Mouth opening uses normalized XY distance between `MIDDLE_FINGER_TIP` and `PINKY_TIP`, their z-depth difference, and scale normalization using `WRIST` to `MIDDLE_FINGER_TIP`.

## Development Rules

- Keep the two modes separate unless the user explicitly asks for a shared interface.
- Do not make Skeleton Pixel Mode depend on PNG assets.
- Do not reset `CLOSED_RATIO = 0.29` or `OPEN_RATIO = 0.36` casually.
- Keep `head.png` and `jaw.png` as separate layers in PNG Puppet Mode.
- Preserve mirror input behavior for live playability.
- Prefer small, reversible changes and run Python syntax checks after script edits.

## Mac動作確認環境

- macOS
- Python 3.11.15
- mediapipe 0.10.14
- OpenCV camera index: 0
- mode_png_puppet 起動確認済み
- mode_skeleton_pixel 起動確認済み
