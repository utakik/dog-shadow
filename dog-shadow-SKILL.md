# Hand Dog Shadow Skill

Hand tracking input controls a dog-shadow / dog-head visual effect using MediaPipe Hands, OpenCV, and two transparent PNG parts: `head.png` and `jaw.png`.

Origin: hand-recognition experiment for making a dog-like form appear from finger motion. This repository currently contains an experimental working snapshot with 2 PNG assets for the head and jaw.

## When to use

Use this skill when:

- You want to control a dog head, dog shadow, or jaw animation from a live hand camera feed.
- You want to restart the earlier hand-recognition / dog-form experiment.
- You need a compact OpenCV + MediaPipe prototype that maps hand landmarks to image rotation, flip, scale, and mouth opening.
- You want to develop the experiment toward glove monitors, shadow play, rough pixel-dog rendering, or body-driven visual puppets.

## Core idea

The hand is not classified as a gesture first. Instead, selected hand landmarks become continuous control signals:

- hand direction -> dog head direction
- finger spread / z-depth -> jaw opening
- hand scale -> dog scale
- left/right finger direction -> horizontal flip
- smoothed motion -> less jittery puppet movement

The important point is that the dog shape is generated as an effect of bodily motion, not as a fixed character animation.

## Current working version

The current working snapshot uses:

- Python
- OpenCV
- MediaPipe Hands
- NumPy
- two PNG assets:
  - `head.png`
  - `jaw.png`

The main method reads camera input, detects one hand, extracts landmarks, then overlays the dog head and jaw as RGBA images on the live frame.

## Landmark mapping

Current mapping:

- `WRIST` -> hand scale reference
- `MIDDLE_FINGER_MCP` -> direction base
- `MIDDLE_FINGER_TIP` -> direction tip and mouth control
- `PINKY_TIP` -> mouth control with middle fingertip
- `RING_FINGER_MCP` -> dog placement center

Mouth opening is based on:

- normalized XY distance between `MIDDLE_FINGER_TIP` and `PINKY_TIP`
- z-depth difference between the same points
- scale normalization using `WRIST` to `MIDDLE_FINGER_TIP`

## Parameters to preserve

These values are important calibration points and should not be casually reset:

```python
CLOSED_RATIO = 0.29
OPEN_RATIO = 0.36
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

Known visual contour note from the broader project:

```text
Best hand-contour-looking parameter observed earlier: thr=0, smooth=112.
```

Keep this as an observation, not necessarily as a hard dependency for this version.

## How it works

1. Detect available cameras.
2. Open a 640x480 camera stream.
3. Flip the input horizontally for mirror-like interaction.
4. Run MediaPipe Hands with one hand.
5. Extract hand landmarks.
6. Compute a mouth-opening ratio.
7. Smooth jaw motion.
8. Compute left/right direction and horizontal flip.
9. Compute dog head tilt from the middle finger direction.
10. Compute scale from hand length.
11. Overlay `head.png` and `jaw.png` with RGBA alpha blending.
12. Display ratio, FPS, and optional hand landmarks.

## Hard-won lessons

- Do not turn the hand into discrete gestures too early. Continuous ratios are more useful for this experiment.
- Preserve the mouth calibration thresholds. Small changes make the dog feel dead or too nervous.
- `MIDDLE_FINGER_TIP` and `PINKY_TIP` work as a simple mouth-control pair because their XY spread and Z difference both contribute to expression.
- The dog should follow the hand, but not exactly. Smoothing creates puppet-like delay.
- Keep `head.png` and `jaw.png` as separate layers. A single image loses the mouth mechanism.
- Mirror input is important for playability. Without it, the body-image relation becomes confusing.

## Repository organization target

Recommended cleanup target:

```text
dog-shadow/
├─ SKILL.md
├─ README.md
├─ src/
│  └─ dog_overlay_live.py
├─ assets/
│  └─ jaw/
│     ├─ head.png
│     └─ jaw.png
├─ examples/
├─ notes/
└─ archive/
```

The current repository may still contain an older snapshot folder. Do not reorganize aggressively until the working script and PNG paths are confirmed.

## Development directions

Possible next steps:

- split the current working script into `src/dog_overlay_live.py`
- move PNG files into `assets/jaw/`
- add a small calibration screen for `CLOSED_RATIO` and `OPEN_RATIO`
- add recording output for demo videos
- add a pixel-dog / low-resolution rendering mode
- add an AI HAT / Raspberry Pi camera variant
- merge with `ai-hat-vision` only at the interface level, not by mixing repositories too early

## How to ask an AI to use this skill

Use a prompt like:

```text
Use the Hand Dog Shadow Skill in this repository. Read SKILL.md first. The goal is to restart the hand-tracking dog-shadow experiment, preserve the current mouth thresholds, and make the existing working version easier to run without breaking the PNG asset paths.
```

## Improving this skill

After each session, append:

- what camera/environment was used
- what hand landmarks worked or failed
- which parameters changed
- what the dog felt like visually
- which script and asset paths are currently canonical
