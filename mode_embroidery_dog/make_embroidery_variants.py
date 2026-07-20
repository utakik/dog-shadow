from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import cv2
import numpy as np

BASE = Path(__file__).resolve().parent
src_path = BASE / "assets/source/embroidery_dog_source.jpg"
body_src_path = BASE / "assets/source/trace_sox_dog.png"
out_dir = BASE / "assets/generated"
out_dir.mkdir(parents=True, exist_ok=True)

img = Image.open(src_path).convert("RGB")
body_img = Image.open(body_src_path).convert("RGBA") if body_src_path.exists() else None


def make_dog_alpha(source_img):
    arr = np.array(source_img)
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    maxc = arr.max(axis=2)
    minc = arr.min(axis=2)
    chroma = maxc - minc
    h, w = maxc.shape

    # Bright thread is the main body. Keep this strict so gray sock fibers do
    # not become the seed for the cutout.
    white_thread = (maxc > 165) & (minc > 115) & (chroma < 85)
    red_thread = (r > 120) & (g < 90) & (b < 95) & ((r - g) > 35)
    yellow_thread = (r > 145) & (g > 95) & (b < 95) & ((r - b) > 45)
    seed = (white_thread | red_thread | yellow_thread).astype(np.uint8)

    # Remove unrelated bright spots by keeping seed components in the central
    # embroidery area.
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(seed, 8)
    kept = np.zeros_like(seed)
    for label in range(1, num_labels):
        area = stats[label, cv2.CC_STAT_AREA]
        cx, cy = centroids[label]
        if area < 80:
            continue
        if (0.22 * w) <= cx <= (0.78 * w) and (0.39 * h) <= cy <= (0.72 * h):
            kept[labels == label] = 255

    kernel = np.ones((19, 19), np.uint8)
    kept = cv2.morphologyEx(kept, cv2.MORPH_CLOSE, kernel, iterations=2)
    nearby_mask = cv2.dilate(kept, np.ones((65, 65), np.uint8), iterations=1)
    nearby = nearby_mask.astype(bool)

    black_thread = (maxc < 100) & (minc < 80)
    detail = ((white_thread | red_thread | yellow_thread) & nearby) | (black_thread & nearby)

    detail = detail.astype(np.uint8) * 255
    detail = cv2.morphologyEx(detail, cv2.MORPH_CLOSE, np.ones((21, 21), np.uint8), iterations=2)
    detail = cv2.morphologyEx(detail, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)

    contours, _ = cv2.findContours(detail, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(detail)
    for contour in contours:
        if cv2.contourArea(contour) >= 250:
            cv2.drawContours(filled, [contour], -1, 255, thickness=cv2.FILLED)

    filled = cv2.bitwise_and(filled, cv2.dilate(kept, np.ones((75, 75), np.uint8), iterations=1))
    filled = cv2.morphologyEx(filled, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8), iterations=1)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(filled, 8)
    if num_labels > 1:
        largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        filled = np.where(labels == largest, 255, 0).astype(np.uint8)
    return Image.fromarray(cv2.GaussianBlur(filled, (7, 7), 0), mode="L")


def save_cutout(source_img, alpha, path):
    rgba = source_img.convert("RGBA")
    rgba.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        pad = 24
        left = max(bbox[0] - pad, 0)
        top = max(bbox[1] - pad, 0)
        right = min(bbox[2] + pad, rgba.width)
        bottom = min(bbox[3] + pad, rgba.height)
        rgba = rgba.crop((left, top, right, bottom))
    rgba.save(path)


def make_pixel_variant(source_img, pixel_size=96):
    w, h = source_img.size
    scale = pixel_size / max(w, h)
    small = source_img.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)
    return small.resize((w, h), Image.Resampling.NEAREST)


def make_line_variant(source_img):
    rgba = source_img.convert("RGBA")
    alpha = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    gray = ImageOps.grayscale(rgb)
    gray = gray.filter(ImageFilter.GaussianBlur(radius=1.2))

    # 輪郭抽出
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edges = ImageOps.autocontrast(edges)

    # 白背景・黒線に反転調整
    arr = np.array(edges)
    threshold = 45
    line_arr = np.where(arr > threshold, 0, 255).astype(np.uint8)
    line = Image.fromarray(line_arr, mode="L").convert("RGBA")
    line.putalpha(alpha)
    return line


dog_alpha = make_dog_alpha(img)
save_cutout(img, dog_alpha, out_dir / "embroidery_dog_cutout.png")

# --- Pixel version ---
# 小さくしてから拡大することでピクセル化
pixel = make_pixel_variant(img)
pixel.save(out_dir / "embroidery_dog_pixel.png")
save_cutout(pixel, dog_alpha, out_dir / "embroidery_dog_pixel_cutout.png")

# --- Line version ---
line = make_line_variant(img).convert("RGB")
line.save(out_dir / "embroidery_dog_line.png")
save_cutout(line, dog_alpha, out_dir / "embroidery_dog_line_cutout.png")

body_outputs = []
if body_img is not None:
    body_pixel = make_pixel_variant(body_img)
    body_pixel_path = out_dir / "embroidery_dog_pixel_body.png"
    body_pixel.save(body_pixel_path)
    body_outputs.append(body_pixel_path)

    body_line = make_line_variant(body_img)
    body_line_path = out_dir / "embroidery_dog_line_body.png"
    body_line.save(body_line_path)
    body_outputs.append(body_line_path)

print("saved:")
print(out_dir / "embroidery_dog_cutout.png")
print(out_dir / "embroidery_dog_pixel.png")
print(out_dir / "embroidery_dog_pixel_cutout.png")
print(out_dir / "embroidery_dog_line.png")
print(out_dir / "embroidery_dog_line_cutout.png")
if body_outputs:
    print("body source:")
    print(body_src_path)
    for path in body_outputs:
        print(path)
else:
    print("body source missing; skipped body outputs:")
    print(body_src_path)
