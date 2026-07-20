
## 追加素材: 刺繍犬

刺繍犬の画像を OneDrive / 11_AI_Skills 側にアップロードした。

この画像は、dog-shadow の第3系統素材として扱う。

想定モード:

- mode_embroidery_dog
- pixel版: 刺繍犬をピクセル化して動かす
- line版: 刺繍犬を線画化して有機的に動かす

表現方針:

- 指の方向を意識して、犬の毛がそちらへ流れるようにする
- 手が犬になっている時だけ効果をかける
- 手が犬になっていない時は、pixel / line どちらの効果も出さない
- 既存の mode_png_puppet / mode_skeleton_pixel とは分けて扱う

今後の候補構成:

02_code/mode_embroidery_dog/
├─ assets/
│  └─ source/
│     └─ embroidery_dog_source.jpg
├─ embroidery_pixel_flow.py
└─ embroidery_line_flow.py

正式ソース素材:

- 手動切り抜き済みの背景透明PNG `02_code/mode_embroidery_dog/assets/source/trace_sox_dog.png` を、今後の刺繍犬の本命ソース素材として使う。
- `embroidery_dog_source.jpg` は自動切り抜き検証用の元写真として残す。
- `make_embroidery_variants.py` は `trace_sox_dog.png` が存在する場合、アルファを保持した `embroidery_dog_pixel_body.png` / `embroidery_dog_line_body.png` を追加生成する。
