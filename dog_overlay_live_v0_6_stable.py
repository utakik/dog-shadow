import cv2

import numpy as np

import mediapipe as mp

# =====================

# 基本設定

# =====================

CAM_INDEX = 0

W, H = 640, 480

WIN = "dog hand v0.6"

# =====================

# MediaPipe

# =====================

mp_hands = mp.solutions.hands

hands = mp_hands.Hands(

    max_num_hands=1,

    min_detection_confidence=0.5,

    min_tracking_confidence=0.5

)

# =====================

# Utility

# =====================

def lms_to_pts(lms, w, h):

    return np.array([[lm.x * w, lm.y * h] for lm in lms.landmark], np.int32)

def compute_thickness(pts):
    xs = pts[:, 0]
    ys = pts[:, 1]
    size = max(xs.max() - xs.min(), ys.max() - ys.min())

    return int(np.clip(size * 0.06, 10, 60))

# =====================

# マスク生成

# =====================

def make_hand_mask(h, w, pts, thick, close_k, smooth_k):

    mask = np.zeros((h, w), np.uint8)

    # --- 骨格 ---

    edges = [

        (0,1),(1,2),(2,3),(3,4),

        (0,5),(5,6),(6,7),(7,8),

        (0,9),(9,10),(10,11),(11,12),

        (0,13),(13,14),(14,15),(15,16),

        (0,17),(17,18),(18,19),(19,20),

        (5,9),(9,13),(13,17)

    ]

    for a, b in edges:

        cv2.line(mask, tuple(pts[a]), tuple(pts[b]), 255, thick, cv2.LINE_AA)

    for p in pts:

        cv2.circle(mask, tuple(p), max(1, thick // 2), 255, -1)

    # --- 手のひら（面） ---

    palm_idx = [0, 5, 9, 13, 17]

    palm = pts[palm_idx]

    cv2.fillConvexPoly(mask, cv2.convexHull(palm), 255)

    # --- close（指を繋げる） ---

    if close_k > 0:

        k = close_k | 1

        ker = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))

        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, ker, iterations=1)

    # --- smooth（肉の丸み） ---

    if smooth_k > 0:

        mask = cv2.GaussianBlur(mask, (0, 0), smooth_k, smooth_k)

    return mask

# =====================

# モザイク（固定分割）

# =====================

def pixelize_fixed(frame, mask, grid):

    ys, xs = np.where(mask > 0)

    if len(xs) == 0:

        return frame

    x0, x1 = xs.min(), xs.max() + 1

    y0, y1 = ys.min(), ys.max() + 1

    roi = frame[y0:y1, x0:x1]

    mroi = mask[y0:y1, x0:x1]

    g = max(2, grid)

    small = cv2.resize(roi, (g, g), interpolation=cv2.INTER_AREA)

    pix = cv2.resize(small, (roi.shape[1], roi.shape[0]),

                     interpolation=cv2.INTER_NEAREST)

    out = frame.copy()

    out_roi = out[y0:y1, x0:x1]

    out_roi[mroi > 0] = pix[mroi > 0]

    out[y0:y1, x0:x1] = out_roi

    return out

# =====================

# メイン

# =====================

def main():

    cap = cv2.VideoCapture(CAM_INDEX)

    cap.set(3, W)

    cap.set(4, H)

    cv2.namedWindow(WIN, cv2.WINDOW_NORMAL)

    cv2.resizeWindow(WIN, 1000, 800)

    # --- スライダー（最小限） ---

    cv2.createTrackbar("thr",   WIN, 45, 200, lambda x: None)

    cv2.createTrackbar("smooth",WIN, 12, 120, lambda x: None)

    cv2.createTrackbar("close", WIN,  0, 140, lambda x: None)

    cv2.createTrackbar("grid",  WIN, 24,  48, lambda x: None)

    while True:

        ok, frame = cap.read()

        if not ok:

            break

        frame = cv2.flip(frame, 1)

        thr   = cv2.getTrackbarPos("thr", WIN)

        smooth= cv2.getTrackbarPos("smooth", WIN)

        close = cv2.getTrackbarPos("close", WIN)

        grid  = cv2.getTrackbarPos("grid", WIN)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        res = hands.process(rgb)

        out = frame.copy()

        if res.multi_hand_landmarks:

            lms = res.multi_hand_landmarks[0]

            h, w = frame.shape[:2]

            pts = lms_to_pts(lms, w, h)

            thick = compute_thickness(pts)

            mask = make_hand_mask(

                h, w, pts,

                thick=thick,

                close_k=close,

                smooth_k=smooth

            )

            _, mask = cv2.threshold(mask, thr, 255, cv2.THRESH_BINARY)

            out = pixelize_fixed(out, mask, grid)

            # 輪郭線（観察用）

            cnt, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            cv2.drawContours(out, cnt, -1, (0, 255, 0), 2)

        cv2.putText(

            out,

            "v0.6 stable | thr smooth close grid | q quit",

            (12, 28),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.7,

            (255,255,255),

            2

        )

        cv2.imshow(WIN, out)

        key = cv2.waitKey(1) & 0xff

        if key == ord("q") or key == 27:

            break

    cap.release()

    cv2.destroyAllWindows()

if __name__ == "__main__":

    main()
 