from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np

BASE = Path(__file__).resolve().parent
src_path = BASE / "assets/source/embroidery_dog_source.jpg"
out_dir = BASE / "assets/generated"
out_dir.mkdir(parents=True, exist_ok=True)

img = Image.open(src_path).convert("RGB")

# --- Pixel version ---
# 小さくしてから拡大することでピクセル化
pixel_size = 96
w, h = img.size
scale = pixel_size / max(w, h)
small = img.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)
pixel = small.resize((w, h), Image.Resampling.NEAREST)
pixel.save(out_dir / "embroidery_dog_pixel.png")

# --- Line version ---
gray = ImageOps.grayscale(img)
gray = gray.filter(ImageFilter.GaussianBlur(radius=1.2))

# 輪郭抽出
edges = gray.filter(ImageFilter.FIND_EDGES)
edges = ImageOps.autocontrast(edges)

# 白背景・黒線に反転調整
arr = np.array(edges)
threshold = 45
line_arr = np.where(arr > threshold, 0, 255).astype(np.uint8)
line = Image.fromarray(line_arr, mode="L").convert("RGB")
line.save(out_dir / "embroidery_dog_line.png")

print("saved:")
print(out_dir / "embroidery_dog_pixel.png")
print(out_dir / "embroidery_dog_line.png")
