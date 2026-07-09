# Hand Dog Shadow Skill

Hand Dog Shadow is a small OpenCV + MediaPipe experiment for making dog-shadow forms from live hand motion.

The repository is organized as two separate modes. Keep them separate: the PNG puppet mode is an image-layer puppet, while the skeleton pixel mode is a PNG-free expression path based on hand masks, contours, and pixelization.

## Modes

### `mode_png_puppet`

PNG puppet mode overlays two transparent image parts on the camera feed:

- `mode_png_puppet/assets/head.png`
- `mode_png_puppet/assets/jaw.png`

Run:

```bash
python3 mode_png_puppet/dog_overlay_live.py
```

Controls:

- `l`: toggle MediaPipe landmarks
- `c`: switch camera when multiple cameras are detected
- `q`: quit

Important mouth calibration values:

```python
CLOSED_RATIO = 0.29
OPEN_RATIO = 0.36
```

Do not casually change these values; they are part of the working mouth feel.

### `mode_skeleton_pixel`

Skeleton pixel mode does not use PNG assets. It builds a hand mask from MediaPipe landmarks, then applies contour and pixelization effects.

Run:

```bash
python3 mode_skeleton_pixel/dog_overlay_live_v0_6_stable.py
```

Controls:

- Trackbars: `thr`, `smooth`, `close`, `grid`
- `q` or `Esc`: quit

This mode is a candidate for the main visual direction. Do not merge it into the PNG puppet mode unless the interface is intentionally redesigned.

## Install

Use a Python environment with camera access, then install:

```bash
pip install -r requirements.txt
```

Required packages:

- `opencv-python`
- `mediapipe`
- `numpy`
