import cv2

import mediapipe as mp

import math

import numpy as np

import time

from pathlib import Path

mp_hands = mp.solutions.hands

mp_drawing = mp.solutions.drawing_utils

# ===== パラメータ =====

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

show_landmarks = False

# ===== カメラ自動検出 =====

def find_cameras(max_test=5):

    cams = []

    for i in range(max_test):

        cap_test = cv2.VideoCapture(i)

        if cap_test.isOpened():

            cams.append(i)

            cap_test.release()

    return cams

# ===== ユーティリティ =====

def dist_norm_xy(a, b):

    return math.hypot(a.x - b.x, a.y - b.y)

def overlay_rgba_center(bg_bgr, fg_rgba, cx, cy,

                        angle_deg=0.0, scale=1.0, flip_horizontal=False):

    fg = fg_rgba

    if flip_horizontal:

        fg = cv2.flip(fg, 1)

    if scale != 1.0:

        fg = cv2.resize(fg, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)

    h_fg, w_fg = fg.shape[:2]

    center = (w_fg // 2, h_fg // 2)

    M = cv2.getRotationMatrix2D(center, angle_deg, 1.0)

    fg = cv2.warpAffine(

        fg, M, (w_fg, h_fg),

        flags=cv2.INTER_LINEAR,

        borderMode=cv2.BORDER_CONSTANT,

        borderValue=(0, 0, 0, 0)

    )

    x1 = int(cx - w_fg / 2)

    y1 = int(cy - h_fg / 2)

    x2 = x1 + w_fg

    y2 = y1 + h_fg

    h_bg, w_bg = bg_bgr.shape[:2]

    if x2 <= 0 or y2 <= 0 or x1 >= w_bg or y1 >= h_bg:

        return bg_bgr

    x1c, y1c = max(x1, 0), max(y1, 0)

    x2c, y2c = min(x2, w_bg), min(y2, h_bg)

    fg_x1 = x1c - x1

    fg_y1 = y1c - y1

    fg_x2 = fg_x1 + (x2c - x1c)

    fg_y2 = fg_y1 + (y2c - y1c)

    fg_crop = fg[fg_y1:fg_y2, fg_x1:fg_x2]

    bg_crop = bg_bgr[y1c:y2c, x1c:x2c]

    # サイズ不一致対応（安全補正）

    bh, bw = bg_crop.shape[:2]

    fh, fw = fg_crop.shape[:2]

    if (bh != fh) or (bw != fw):

        fg_crop = cv2.resize(fg_crop, (bw, bh))

    if fg_crop.ndim == 3 and fg_crop.shape[2] == 4:

        fg_rgb = fg_crop[:, :, :3]

        alpha = fg_crop[:, :, 3].astype(np.float32) / 255.0

        alpha = alpha[..., None]

    else:

        fg_rgb = fg_crop

        alpha = np.ones((fg_crop.shape[0], fg_crop.shape[1], 1), dtype=np.float32)

    blended = (alpha * fg_rgb + (1 - alpha) * bg_crop).astype(np.uint8)

    bg_bgr[y1c:y2c, x1c:x2c] = blended

    return bg_bgr

# ==========================

# メイン処理

# ==========================

def main():

    global show_landmarks

    # --- PNG 読み込み（スクリプト位置基準） ---

    base_dir = Path(__file__).resolve().parent

    head_path = base_dir / "head.png"

    jaw_path = base_dir / "jaw.png"

    print("head_path:", head_path)

    print("jaw_path :", jaw_path)

    head_png = cv2.imread(str(head_path), cv2.IMREAD_UNCHANGED)

    jaw_png = cv2.imread(str(jaw_path), cv2.IMREAD_UNCHANGED)

    if head_png is None or jaw_png is None:

        print("PNG が読み込めない")

        print("exists head?", head_path.exists())

        print("exists jaw? ", jaw_path.exists())

        return

    # --- カメラ検出 ---

    cams = find_cameras()

    print("検出されたカメラ:", cams)

    if len(cams) == 0:

        print("カメラが見つからない")

        return

    camera_index = 0

    # --- 初期カメラ起動 ---

    cap = cv2.VideoCapture(cams[camera_index])

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)

    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # FPS 計測

    start = time.time()

    count = 0

    fps_value = 0.0

    prev_t = 0.0

    prev_tilt = 0.0

    prev_dir = None

    ratio = 0.0

    with mp_hands.Hands(

        max_num_hands=1,

        min_detection_confidence=0.5,

        min_tracking_confidence=0.5,

        model_complexity=1

    ) as hands:

        while True:

            ret, frame = cap.read()

            if not ret:

                print("フレーム取得失敗")

                break

            # ===== 入力を左右反転 =====

            frame = cv2.flip(frame, 1)

            h, w = frame.shape[:2]

            # ===== MediaPipe 処理 =====

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            rgb.flags.writeable = False

            results = hands.process(rgb)

            rgb.flags.writeable = True

            frame = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

            ratio = 0.0

            if results.multi_hand_landmarks:

                hand = results.multi_hand_landmarks[0]

                lm = hand.landmark

                wrist = lm[mp_hands.HandLandmark.WRIST]

                mid_mcp = lm[mp_hands.HandLandmark.MIDDLE_FINGER_MCP]

                mid_tip = lm[mp_hands.HandLandmark.MIDDLE_FINGER_TIP]

                pinky = lm[mp_hands.HandLandmark.PINKY_TIP]

                ring_center = lm[mp_hands.HandLandmark.RING_FINGER_MCP]

                # ---- 口開き（中指-小指の距離 + z差） ----

                xy = dist_norm_xy(mid_tip, pinky)

                dz = abs(mid_tip.z - pinky.z)

                scale = dist_norm_xy(wrist, mid_tip)

                if scale > 1e-6:

                    ratio = (xy + Z_WEIGHT * dz) / scale

                if ratio <= CLOSED_RATIO:

                    t = 0.0

                elif ratio >= OPEN_RATIO:

                    t = 1.0

                else:

                    t = (ratio - CLOSED_RATIO) / (OPEN_RATIO - CLOSED_RATIO)

                t = max(0.0, min(1.0, t))

                # ---- 顎のスムージング ----

                t_smooth = prev_t + JAW_SMOOTH * (t - prev_t)

                prev_t = t_smooth

                jaw_angle = t_smooth * MAX_JAW_ANGLE_DEG

                # ---- 位置（リング付け根） ----

                cx = int(ring_center.x * w)

                cy = int(ring_center.y * h)

                # ===== 左右判定 =====

                dx = mid_tip.x - mid_mcp.x

                dir_lr = 1 if dx >= 0 else -1

                if prev_dir is not None and abs(dx) < DX_DEADZONE:

                    dir_lr = prev_dir

                prev_dir = dir_lr

                flip = (dir_lr < 0)

                # ===== 手の傾き → 犬の角度 =====

                dy_img = mid_tip.y - mid_mcp.y

                dy = -dy_img  # 画面座標→数学座標っぽく

                tilt_raw = math.degrees(math.atan2(dy, 1.0)) * TILT_GAIN

                tilt_raw = max(-TILT_MAX_DEG, min(TILT_MAX_DEG, tilt_raw))

                tilt = prev_tilt + ANGLE_SMOOTH * (tilt_raw - prev_tilt)

                prev_tilt = tilt

                angle_dog = tilt + TILT_BIAS_DEG + DOG_ANGLE_OFFSET_DEG

                # ===== スケール =====

                hand_len_px = dist_norm_xy(wrist, mid_tip) * w

                scale_dog = (hand_len_px / w) * DOG_SIZE_SCALE

                # ===== flip補正込みの最終角度 =====

                # 水平反転すると見た目の回転方向が逆になるので、頭の角度を反転

                head_angle = -angle_dog if flip else angle_dog

                # jawは頭に対して開く：反転時は引き算↔足し算の関係になる

                jaw_total_angle = (head_angle + jaw_angle) if flip else (head_angle - jaw_angle)

                if show_landmarks:

                    mp_drawing.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)

                # ===== 描画 =====

                frame = overlay_rgba_center(

                    frame, head_png, cx, cy,

                    angle_deg=head_angle,

                    scale=scale_dog,

                    flip_horizontal=flip

                )

                frame = overlay_rgba_center(

                    frame, jaw_png, cx, cy,

                    angle_deg=jaw_total_angle,

                    scale=scale_dog,

                    flip_horizontal=flip

                )

            # ===== テキスト表示 =====

            cv2.putText(frame, f"ratio={ratio:.2f}", (20, 40),

                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

            # FPS 計測（0.3秒ごと）

            count += 1

            now = time.time()

            if now - start >= 0.3:

                fps_value = count / (now - start)

                count = 0

                start = now

            cv2.putText(frame, f"FPS:{fps_value:.1f}", (20, 70),

                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            # UI：ランドマーク表示状態

            lm_text = "LM: ON" if show_landmarks else "LM: OFF"

            cv2.putText(frame, lm_text, (20, 100),

                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 200, 255), 2)

            # UI：カメラ番号

            cam_text = f"CAM: {cams[camera_index]}"

            cv2.putText(frame, cam_text, (20, 130),

                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)

            cv2.imshow("Dog Overlay - tutorial mode", frame)

            # ===== キー処理 =====

            key = cv2.waitKey(1) & 0xFF

            if key == ord('l'):

                show_landmarks = not show_landmarks

            if key == ord('c') and len(cams) >= 2:

                cap.release()

                camera_index = (camera_index + 1) % len(cams)

                cap = cv2.VideoCapture(cams[camera_index])

                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)

                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

            if key == ord('q'):

                break

    cap.release()

    cv2.destroyAllWindows()


if __name__ == "__main__":

    main()
 