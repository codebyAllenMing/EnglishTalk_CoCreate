"""
把 assets/source/ 的 AI 產出母檔，處理成 apps/web/public/images/ 的正式 WebP。

用法：
    python assets/tools/build_icons.py            # 全部重跑
    python assets/tools/build_icons.py features   # 只跑四特色
    python assets/tools/build_icons.py steps      # 只跑四步驟

每組各自平衡視覺重量 —— 兩組在頁面上是分開的區塊，不必跟對方對齊，
而且四步驟有 CSS 圓底、四特色沒有，視覺基準本來就不同。
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from iconkit import balance, cutout, recolor  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets" / "source"
OUTPUT = ROOT / "apps" / "web" / "public" / "images"

# 四特色 —— 無圓底，圖示直接放在白卡上
FEATURES = {
	"feature-availability": dict(
		src="日曆.png",
		# ChatGPT 參考盾牌那張的質感時，把顏色也一起抄成青綠了。
		# 色相 172° → 253° 位移回 primary-500 #6948DC，3D 光影原封不動。
		recolor=dict(hue_shift=81 / 360, saturation_scale=1.36, lift=0.14),
	),
	"feature-group-chats": dict(src="雙怪獸.png"),
	"feature-reputation": dict(src="盾牌.png"),
	"feature-together": dict(src="愛心.png"),
}

# 四步驟 —— 圓底是 CSS 畫的，出圖時要求不要畫圓底，底色才調得動
STEPS = {
	"step-create-monster": dict(
		src="monster.png",
		# 紫偏亮偏藍，H 259° → 253° 並稍微壓暗。min_saturation 避開眼白與高光。
		recolor=dict(hue_shift=-6 / 360, lightness_scale=0.94, min_saturation=0.15),
	),
	"step-set-time": dict(src="time.png"),
	"step-find-room": dict(src="room.png"),
	"step-talk-grow": dict(src="grow.png"),
}

# 統計面板的四個小圖示 —— 顯示只有 40px，是前兩組的一半
STATS = {
	"stat-learners": dict(
		src="笑臉圓.png",
		# 偏橘偏暗，提亮並降飽和收進 --color-token #F4D15E
		recolor=dict(hue_shift=2 / 360, saturation_scale=0.92, lift=0.24, min_saturation=0.15),
	),
	"stat-conversations": dict(
		src="對話框.png",
		# H 259° → 253°，順帶對齊 primary-500 的飽和與明度
		recolor=dict(hue_shift=-5.7 / 360, saturation_scale=1.10, lightness_scale=0.956,
		             min_saturation=0.15),
	),
	# 地球的藍綠不在 palette 內，但它是寫實物件，硬套 palette 反而不像地球
	"stat-countries": dict(src="地球.png"),
	"stat-rating": dict(
		src="星星.png",
		recolor=dict(saturation_scale=0.92, lift=0.24, min_saturation=0.15),
	),
}

# 從統計面板右下角探出來的粉紅怪獸。單獨一組 —— 它顯示 112px，
# 跟 40px 的圖示一起平衡會把它壓得太小。
PEEK = {
	"monster-peek": dict(src="怪獸探頭.png"),
}

# 評價區的三個頭像。三張並排，最怕大小不一 —— 出圖時取景就有落差
# （lucas 佔畫布 89%、sophie 76%、minji 72%），靠 balance() 拉齊。
AVATARS = {
	"avatar-sophie": dict(src="avatar-sophie.png"),
	"avatar-lucas": dict(src="avatar-lucas.png"),
	"avatar-minji": dict(
		src="avatar-minji.png",
		# 跟 step-create-monster 同樣的漂移：紫偏亮偏藍，收回 primary-500
		recolor=dict(hue_shift=-6 / 360, lightness_scale=0.94, min_saturation=0.15),
	),
}

GROUPS = {
	# fill 小一點是因為圖只有 56–80px 卻放在更大的圓裡，要留邊不頂到圓
	"features": (FEATURES, dict(fill=0.92, box_weight=0.0)),
	"steps": (STEPS, dict(fill=0.86, box_weight=0.5)),
	"stats": (STATS, dict(fill=0.92, box_weight=0.5)),
	"peek": (PEEK, dict(fill=0.96, box_weight=0.0)),
	"avatars": (AVATARS, dict(fill=0.92, box_weight=0.6)),
}


def build(group_name):
	specs, balance_opts = GROUPS[group_name]

	prepared = {}
	for name, spec in specs.items():
		image = cutout(SOURCE / spec["src"])
		if "recolor" in spec:
			image = recolor(image, **spec["recolor"])
		prepared[name] = image

	OUTPUT.mkdir(parents=True, exist_ok=True)
	for name, image in balance(prepared, **balance_opts).items():
		path = OUTPUT / f"{name}.webp"
		image.save(path, "WEBP", quality=92, method=6)
		print(f"  {name:24s} {path.stat().st_size / 1024:5.1f} KB")


if __name__ == "__main__":
	targets = sys.argv[1:] or list(GROUPS)
	for target in targets:
		if target not in GROUPS:
			sys.exit(f"未知的群組 {target!r}，可用：{', '.join(GROUPS)}")
		print(f"[{target}]")
		build(target)
