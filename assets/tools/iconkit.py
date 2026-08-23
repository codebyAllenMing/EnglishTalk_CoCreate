"""
素材處理工具：去背、調色、視覺重量平衡。

AI 產出的圖不能直接用 —— 帶白底、顏色每次都漂、各張大小不一。
這裡把那三道工序寫成可重跑的函式，不必每次重寫。

相依：pillow、numpy、scipy
"""

import numpy as np
from PIL import Image
from scipy.ndimage import label

# 判定「這個像素算白色」的容差。AI 出圖的白底通常在 243–255 之間浮動。
WHITE_TOLERANCE = 12


def cutout(path, tolerance=WHITE_TOLERANCE):
	"""
	去背，回傳 RGBA 的 Image。

	用連通區域分析而不是單純「刪掉所有白色」—— 只刪與畫布邊緣相連的白色區塊，
	圖形內部的白（眼白、盾牌上的星星、勾勾、日曆頁面）完整保留。

	⚠️ 不要用四角中位數推背景色。手機版 banner 的構圖是「上方留白、下方場景佔滿」，
	   左下會取到沙發、右下取到桌子，推出來的背景色是錯的。
	"""
	rgb = np.array(Image.open(path).convert("RGB"))
	is_white = (255 - rgb.min(axis=2)) <= tolerance
	regions, _ = label(is_white)

	# 只有碰到畫布四邊的白色區塊才算背景
	edge_labels = (
		set(regions[0, :]) | set(regions[-1, :]) | set(regions[:, 0]) | set(regions[:, -1])
	)
	edge_labels.discard(0)

	background = np.isin(regions, list(edge_labels))
	alpha = np.where(background, 0, 255).astype(np.uint8)
	return Image.fromarray(np.dstack([rgb, alpha]))


def rgb_to_hls(arr):
	"""向量化的 RGB→HLS。arr 是 0–255 的 float ndarray (H, W, 3)。"""
	a = arr / 255.0
	mx, mn = a.max(axis=2), a.min(axis=2)
	lightness = (mx + mn) / 2
	delta = mx - mn
	saturation = np.where(
		delta == 0,
		0,
		delta / np.where(lightness < 0.5, mx + mn + 1e-12, 2 - mx - mn + 1e-12),
	)

	r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
	hue = np.zeros_like(lightness)
	nonzero = delta > 1e-9
	is_r = nonzero & (mx == r)
	is_g = nonzero & (mx == g) & ~is_r
	is_b = nonzero & (mx == b) & ~is_r & ~is_g
	hue[is_r] = ((g - b)[is_r] / delta[is_r]) % 6
	hue[is_g] = ((b - r)[is_g] / delta[is_g]) + 2
	hue[is_b] = ((r - g)[is_b] / delta[is_b]) + 4
	return (hue / 6) % 1.0, lightness, saturation


def hls_to_rgb(hue, lightness, saturation):
	"""向量化的 HLS→RGB，回傳 uint8 ndarray (H, W, 3)。"""

	def channel(n):
		k = (n + hue * 12) % 12
		amp = saturation * np.minimum(lightness, 1 - lightness)
		return lightness - amp * np.maximum(-1, np.minimum(np.minimum(k - 3, 9 - k), 1))

	return np.clip(np.dstack([channel(0), channel(8), channel(4)]) * 255, 0, 255).astype(np.uint8)


def recolor(image, hue_shift=0.0, saturation_scale=1.0, lightness_scale=1.0, lift=0.0,
            min_saturation=0.0):
	"""
	在 HLS 空間位移顏色，保留原本的體積光影。

	直接改 RGB 會把漸層壓平；改 HLS 只動色相/飽和/明度，3D 的高光與陰影原封不動。
	日曆那張就是這樣從青綠 172° 位移到紫 253° 的。

	hue_shift        色相位移，單位是「度」除以 360（例：+81 度傳 81/360）
	saturation_scale 飽和度倍率
	lightness_scale  明度倍率（整體壓暗/提亮）
	lift             往白色靠：l + (1-l)*lift。亮處幾乎不動，暗處提亮，
	                 比 lightness_scale 更不容易讓高光爆掉
	min_saturation   只處理飽和度高於此值的像素，用來避開白色眼白與高光
	"""
	arr = np.array(image.convert("RGBA"))
	rgb, alpha = arr[:, :, :3].astype(float), arr[:, :, 3]
	hue, lightness, saturation = rgb_to_hls(rgb)

	target = saturation > min_saturation if min_saturation > 0 else np.ones_like(saturation, bool)

	new_hue = hue.copy()
	new_lightness = lightness.copy()
	new_saturation = saturation.copy()
	new_hue[target] = (hue[target] + hue_shift) % 1.0
	new_saturation[target] = np.clip(saturation[target] * saturation_scale, 0, 1)
	new_lightness[target] = lightness[target] * lightness_scale
	new_lightness[target] = new_lightness[target] + (1 - new_lightness[target]) * lift

	return Image.fromarray(np.dstack([hls_to_rgb(new_hue, new_lightness, new_saturation), alpha]))


def _measure(image):
	"""裁到物件外框，並量出這塊墨有多重。"""
	arr = np.array(image.convert("RGBA"))
	ys, xs = np.where(arr[:, :, 3] > 0)
	box = image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

	cropped = np.array(box)
	opaque = cropped[:, :, 3] > 0
	# 深度 = 離白色多遠。淺色物件（白底日曆）深度低，深色物件（紫怪獸）深度高。
	depth = (255 - cropped[:, :, :3].min(axis=2))[opaque].mean()
	return box, depth, depth * opaque.sum()


def balance(images, size=256, fill=0.92, box_weight=0.5):
	"""
	把一組圖示縮放到視覺份量相當，各自置中貼到 size×size 的透明畫布。

	單看外框會忽略「這塊墨有多重」；單看墨量則會在「深色小物 vs 淺色大物」之間失準 ——
	四步驟的日曆主體是白的（平均深度 78.9，其他三張 163–183），純墨量算法把它
	放大到畫布 92%，結果撐爆了圓底。所以兩個係數取加權幾何平均，再加一道硬上限。

	images      {輸出名: PIL.Image(RGBA)}
	fill        物件外框最多佔畫布的比例
	box_weight  0 = 純墨量平衡，1 = 純外框平衡，0.5 = 兩者各半
	回傳        {輸出名: PIL.Image}
	"""
	measured = {}
	for name, image in images.items():
		box, depth, ink = _measure(image)
		measured[name] = dict(box=box, depth=depth, ink=ink, long_edge=max(box.size))

	limit = size * fill
	# 讓最吃虧的那張剛好貼齊上限，其餘按同一標準縮放
	ink_target = min((limit / m["long_edge"]) ** 2 * m["ink"] / size**2 for m in measured.values())
	box_target = min(
		limit,
		min(m["long_edge"] * (ink_target * size**2 / m["ink"]) ** 0.5 for m in measured.values())
		* 1.15,
	)

	result = {}
	for name, m in measured.items():
		scale_ink = (ink_target * size**2 / m["ink"]) ** 0.5
		scale_box = box_target / m["long_edge"]
		scale = scale_ink ** (1 - box_weight) * scale_box**box_weight
		if m["long_edge"] * scale > limit:
			scale = limit / m["long_edge"]

		w, h = m["box"].size
		new_w, new_h = max(1, round(w * scale)), max(1, round(h * scale))
		canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
		canvas.paste(m["box"].resize((new_w, new_h), Image.LANCZOS), ((size - new_w) // 2, (size - new_h) // 2))
		result[name] = canvas

	return result


def trim(image, alpha_floor=8):
	"""
	裁掉四周的透明邊。

	alpha_floor 不用 0 是因為 AI 出圖的邊緣常有一圈近乎全透明的雜訊
	（alpha 1~5），照 0 去裁會多留十幾 px 的空邊，絕對定位就對不準。
	"""
	arr = np.array(image.convert("RGBA"))
	ys, xs = np.where(arr[:, :, 3] > alpha_floor)
	return image.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def fit(image, long_edge):
	"""等比縮到長邊為 long_edge。只縮不放 —— 放大只會糊掉，不會變清楚。"""
	scale = min(1.0, long_edge / max(image.size))
	if scale == 1.0:
		return image
	return image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))),
	                    Image.LANCZOS)
