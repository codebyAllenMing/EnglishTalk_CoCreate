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

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from iconkit import balance, cutout, fit, recolor, trim  # noqa: E402

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
TESTIMONIALS = {
	"avatar-sophie": dict(src="avatar-sophie.png"),
	"avatar-lucas": dict(src="avatar-lucas.png"),
	"avatar-minji": dict(
		src="avatar-minji.png",
		# 跟 step-create-monster 同樣的漂移：紫偏亮偏藍，收回 primary-500
		recolor=dict(hue_shift=-6 / 360, lightness_scale=0.94, min_saturation=0.15),
	),
}

# 個人首頁的怪獸頭像 —— 10 隻對話夥伴 + 本人。
# 這組**要**進 balance：它們是並排在卡片格狀裡的，寬高比差異會直接變成
# 視覺上的大小不一。揮手的 Bobby / Tao 內容框是 1.3 的橫向，其餘都接近正方形。
AVATARS = {
	f"avatar-{name}": dict(src=f"avatars/{name}.png")
	for name in ("allen", "alex", "bobby", "leo", "luna", "mia", "nina", "ryan", "sunny",
	             "tao", "yuki")
}

# 登入 / 註冊頁的插圖 —— 不進 balance。
# 那個演算法是為了「一排並列的圖示看起來份量相當」而寫的，這裡每隻怪獸各自
# 絕對定位在版面不同角落，尺寸由設計稿決定，硬要互相對齊反而錯。
AUTH = {
	"auth-monster-wave": dict(src="auth/monster_01_v1.png"),        # 青綠揮手 —— 登入頁
	"auth-monster-stand": dict(src="auth/monster_01_v2.png"),       # 同一隻的站姿 —— 註冊頁
	"auth-monster-headphones": dict(src="auth/monster_02_v1.png"),  # 紫，卡片左側
	"auth-monster-antenna": dict(src="auth/monster_03_v1.png"),     # 粉紅，卡片右側
	# 背景是滿版的，不 trim 也不去背 —— 它整張都是內容（極淡暖色塊 + 散落圓點）
	"auth-background": dict(src="auth/background.png", long_edge=1536, flatten=True),
}

# 個人首頁的裝飾插圖 —— 跟 auth 同樣不進 balance，它是單獨定位的裝飾，
# 不跟任何東西並排對齊。星星與碎片畫在圖裡，位置關係固定，不另外拼裝。
PROFILE = {
	"profile-invite": dict(src="profile/invite.png"),   # 側邊欄底部的邀請卡
}

GROUPS = {
	# fill 小一點是因為圖只有 56–80px 卻放在更大的圓裡，要留邊不頂到圓
	"features": (FEATURES, dict(fill=0.92, box_weight=0.0)),
	"steps": (STEPS, dict(fill=0.86, box_weight=0.5)),
	"stats": (STATS, dict(fill=0.92, box_weight=0.5)),
	"peek": (PEEK, dict(fill=0.96, box_weight=0.0)),
	"testimonials": (TESTIMONIALS, dict(fill=0.92, box_weight=0.6)),
	# None = 不做視覺重量平衡，走 build_auth 那條路
	"auth": (AUTH, None),
	"profile": (PROFILE, None),
	# 顯示最大 130px（側邊欄頭像與詳情面板），320 是留給 2x 螢幕的
	"avatars": (AVATARS, dict(size=320, fill=0.92, box_weight=0.5)),
}

# 不做 balance 的那幾組，各自的預設長邊（顯示尺寸的 2x 再留一點餘裕）
LONG_EDGE = {
	"auth": 512,      # 登入頁的怪獸在版面上最寬約 250px
	"profile": 256,   # 邀請卡的怪獸顯示只有 84×90px
}


def save(image, name, quality=88):
	OUTPUT.mkdir(parents=True, exist_ok=True)
	path = OUTPUT / f"{name}.webp"
	image.save(path, "WEBP", quality=quality, method=6)
	print(f"  {name:24s} {str(image.size):12s} {path.stat().st_size / 1024:5.1f} KB")


def build_trimmed(specs, long_edge):
	for name, spec in specs.items():
		image = Image.open(SOURCE / spec["src"])
		if spec.get("flatten"):
			image = image.convert("RGB")
		else:
			image = trim(image.convert("RGBA"))
		save(fit(image, spec.get("long_edge", long_edge)), name)


def build(group_name):
	specs, balance_opts = GROUPS[group_name]
	if balance_opts is None:
		return build_trimmed(specs, LONG_EDGE[group_name])

	prepared = {}
	for name, spec in specs.items():
		image = cutout(SOURCE / spec["src"])
		if "recolor" in spec:
			image = recolor(image, **spec["recolor"])
		prepared[name] = image

	for name, image in balance(prepared, **balance_opts).items():
		save(image, name, quality=92)


if __name__ == "__main__":
	targets = sys.argv[1:] or list(GROUPS)
	for target in targets:
		if target not in GROUPS:
			sys.exit(f"未知的群組 {target!r}，可用：{', '.join(GROUPS)}")
		print(f"[{target}]")
		build(target)
