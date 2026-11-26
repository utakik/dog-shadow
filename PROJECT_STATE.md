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


## 上位プロジェクト（Animal shadow）との関係と整理の記録（2026-11-26）

dog-shadow は、上位リポジトリ `animal-shaddow`（GitHub: `utakik/animal-shadow`）の中に置かれた独立Gitリポジトリ（remote: `utakik/dog-shadow`）。上位側では `.gitignore` 対象のため、上位のcommit・pushでは保存されない。dog-shadow側で別にcommit・pushが必要。

### 読み取り専用監査（Codex、2026-11-26）の要点
- 作業場所が2つある。正式: `/Users/utakik_mac/projects/01_active/animal-shaddow`（branch `codex/preserve-local-work-20261126`）。もう一つ: `/Users/utakik_mac/Documents/ChatGPT/Animal_shadow`（別clone、`main` 7a639cec）。後者には dog-shadow と最新のYOLO作業がない。別cloneで作業すると差分を取り違える。
- 現在ブランチは `origin/main` と分岐（origin/main側12 commit・現在側複数）。単純なfast-forwardではない。branch統合は最後に回す。
- dog-shadow は未コミットの変更・未追跡ファイルを持つ。この文書の `~/projects/01_active/dog-shadow` というパス記載は現在の実体と異なる（後日訂正）。
- 文書の役割は、規約=`AGENTS.md`（共通の正本）、現在状態=`MEMORY.md`、日次の事実=`docs/work-log/`、入口=`README.md`。AI固有ファイルは参照だけを置く。
- 提案された順序: ①作業場所の確定 ②未コミットYOLO成果の保護 ③文書の食い違い修正 ④READMEの最小更新 ⑤綴り揺れの一覧化（改名は保留） ⑥`04_output/`の索引化 ⑦branch統合。

### この日に実施した処理（Claude、ユーザー承認済み）
- ストリームA（YOLO）の文書を現状へ同期し、commit 5815ff0 を作成（branch `codex/preserve-local-work-20261126`）。変更は `docs/luckfox-recognition/` の experiments.md（重複行の削除）、streams.md（A行を更新）、handoff-A-yolo-2026-11-26.md（GitHubリモート名の訂正、seg実測結果の反映）。
- Project「Animal shadow」側のhandoffコピーも同内容へ更新（正本はリポジトリ）。
- push は未実施。Claudeの実行環境からはGitHubへpushできず、ユーザーが自分のターミナルで行う。
- `sam_test/` の未追跡ファイルと `main` には触れていない。

### YOLO（ストリームA）の現在地
- クラス7種決定（sneaker / leather_shoe / slipper / glasses / sunglasses / coin / mug）。ラベルは12枚・28箱。
- 学習済み yolov8n-seg / yolov8n を RV1103 向けINT8へ変換、4モデルとも成功。実機のseg一続き（縮小→推論→読出し→後処理）は seg320 が約49〜61ms、seg256 が約34〜39ms（CPU governor により変わる）。数値の正は `docs/luckfox-recognition/experiments.md` と `docs/work-log/2026-11-26.md`。
- 輪郭表示方式（seg学習／箱+輪郭処理／固定シルエット）は未決。

### 未了
- Claude Code のYOLO作業は再開予定。変換コード `02_code/261126_luckfox_yolo/` は commit cfe2d3c に含まれる。
- 上位の `MEMORY.md` の日付、`README.md` のLuckfox・作業場所の記述は未更新。
- 作業場所は正式作業場所の1つに一本化（ユーザー決定、2026-11-26）。Documents側cloneは通常作業に使わない（削除・移動はしていない）。
- 正式作業場所とdog-shadowの状態を保存してから、branch統合を検討する。
