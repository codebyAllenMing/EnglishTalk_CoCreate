export type AvatarChoice = {
	/** 對應 public/images/avatar-${id}.webp */
	id: string;
	name: string;
	owned: boolean;
};

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 可以選來當自己頭像的怪獸。grep "FAKE_" 可找出專案所有假內容。
 *
 * ⚠️ **未擁有的怪獸先略過**（使用者 2026-08-27：「其中有鎖住的先選擇忽略」）。
 *    設計稿有 Rocky / Ziggy 兩隻灰掉上鎖的，那要等「用代幣解鎖怪獸」的規則定案，
 *    而且也還沒有那兩隻的圖。`owned` 欄位先留著，篩選與鎖頭的 UI 都照設計稿做好了，
 *    等資料有 false 的那天就會直接動起來。
 *
 * ⚠️ id 與 Find Monsters 的十隻**刻意重疊** —— 怪獸是角色，圖是共用的：
 *    設計稿的挑選清單裡就是 Luna / Bobby / Alex… 這幾個名字。
 *    兩份清單描述的是不同的東西（一份是可選的造型、一份是別的使用者），
 *    所以沒有從 FAKE_MONSTERS 推導，硬把它們綁在一起反而會變成假的耦合。
 *
 * `allen` 排第一是因為那是登入者目前用的那隻 —— 挑選清單一定要含得住傳進來的值，
 * 不然「目前選中」根本畫不出來。
 */
export const FAKE_AVATAR_CHOICES: readonly AvatarChoice[] = [
	{ id: "allen", name: "Allen", owned: true },
	{ id: "luna", name: "Luna", owned: true },
	{ id: "bobby", name: "Bobby", owned: true },
	{ id: "alex", name: "Alex", owned: true },
	{ id: "mia", name: "Mia", owned: true },
	{ id: "sunny", name: "Sunny", owned: true },
	{ id: "tao", name: "Tao", owned: true },
	{ id: "yuki", name: "Yuki", owned: true },
	{ id: "ryan", name: "Ryan", owned: true },
	{ id: "nina", name: "Nina", owned: true },
	{ id: "leo", name: "Leo", owned: true },
];
