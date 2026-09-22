export type AvatarChoice = {
	/** Avatars 表的 code，對應 public/images/avatar-${id}.webp */
	id: string;
	name: string;
	owned: boolean;
};

/**
 * 可以選來當自己頭像的怪獸目錄。
 *
 * ⚠️ **必須跟 DB 的 `Avatars` 表一致**（packages/db 的 AVATAR_CATALOG，由 migration 0001 塞進去）。
 *    圖在前端、FK 在 DB，兩邊各有一份清單；沒做成 API 是因為圖本來就要事先打包在靜態站裡，
 *    多打一次 API 也還是得對回這份檔名。
 *
 * ⚠️ `owned` 一律 true 是**假的**（FAKE_OWNED）—— 擁有權表 UserAvatars 還沒建。
 *    設計稿有 Rocky / Ziggy 兩隻灰掉上鎖的（使用者 2026-08-27：「鎖住的先選擇忽略」），
 *    那要等「用代幣解鎖怪獸」的規則定案，而且也還沒有那兩隻的圖。
 *    篩選與鎖頭的 UI 都照設計稿做好了，等資料有 false 的那天就會直接動起來。
 *
 * ⚠️ id 與 Find Monsters 的十隻**刻意重疊** —— 怪獸是角色，圖是共用的：
 *    設計稿的挑選清單裡就是 Luna / Bobby / Alex… 這幾個名字。
 */
const FAKE_OWNED = true;

const CATALOG = ["allen", "luna", "bobby", "alex", "mia", "sunny", "tao", "yuki", "ryan", "nina", "leo"] as const;

export const AVATAR_CATALOG: readonly AvatarChoice[] = CATALOG.map((id) => ({
	id,
	name: id.charAt(0).toUpperCase() + id.slice(1),
	owned: FAKE_OWNED,
}));
