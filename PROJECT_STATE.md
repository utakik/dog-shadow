# dog-shadow project state

## Source of truth

This repository is the current source of truth for dog-shadow.

Local:

~/projects/01_active/dog-shadow

Remote:

https://github.com/utakik/dog-shadow

OneDrive is currently only a reference/material shelf, not the source of truth.

## Project position

dog-shadow is a focused subproject inside the larger Glove monitor / Glov(b)e monitor frame.

Current priority:
- Do not organize the whole Glove monitor project first.
- Continue from dog-shadow as the concrete working unit.

## Folder roles

- 01_inbox: temporary incoming files
- 02_code: main code and executable assets
- 03_data: input data and source recordings
- 04_output: exported videos and generated results
- 05_notes: work logs and observation notes
- 06_docs: human-facing documentation

## AI handoff order

Other AI assistants should read:

1. README.md
2. SKILL.md
3. PROJECT_STATE.md
4. 05_notes/2026-07-09_dog-shadow_mac-recovery.md
5. relevant files under 02_code/

## Current code areas

- 02_code/260717_svg_html: HTML / SVG / MediaPipe Hands prototype
- 02_code/mode_png_puppet: original PNG puppet version
- 02_code/mode_skeleton_pixel: MediaPipe skeleton / pixel expression branch
- 02_code/mode_embroidery_dog: embroidered dog assets and variant generation

## Design direction

Human hand -> MediaPipe Hands -> dog pose / mouth state / breath signal -> dog shadow, embroidered dog, pixel sand, or organic line expression.

Key mappings:
- large hand motion -> dog position, rotation, scale
- small hand jitter -> dog breathing
- finger spread / mouth ratio -> jaw opening, bark, mouth state
- finger direction -> fur flow, pixel flow, organic line direction

## Mouth state rules

CLOSED:
- tongue hidden
- fangs hidden or almost hidden
- red mouth interior mostly hidden
- lower jaw near upper jaw

OPEN / BARK:
- red mouth interior visible
- fangs visible
- tongue usually hidden
- lower jaw opens

LICK:
- tongue visible
- lower jaw slightly open
- tongue moves forward or outward

## Important constants

Preserve unless intentionally recalibrating:

CLOSED_RATIO = 0.29
OPEN_RATIO = 0.36

## Working rule

Before editing:

git status

After meaningful changes:

git add ...
git commit -m "Clear message"
git push

Do not reorganize OneDrive during active implementation unless explicitly requested.
